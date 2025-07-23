const Os = require("../models/os.model");
const Cidades = require("../models/cidades.model");
const Loja = require("../models/lojas.model");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const Movimentacao = require("../models/movimentacoes_caixa.model");
const Caixa = require("../models/caixa.model");
const mongoose = require("mongoose");
const Produto = require("../models/produtos.model");
const Receber = require("../models/receber.model");

exports.listaOs = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit, searchTerm, searchType } =
      req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        error: "Os valores de page e limit devem ser maiores que 0.",
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    const filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm) {
      if (searchType === "codigo") {
        const codigoNumerico = parseInt(searchTerm, 10);
        if (!isNaN(codigoNumerico)) {
          filtros.codigo_os = codigoNumerico;
        } else {
          filtros.codigo_os = { $regex: searchTerm, $options: "i" };
        }
      } else if (searchType === "cliente") {
        filtros.$or = [
          { "cliente.nome": { $regex: searchTerm, $options: "i" } },
          {
            "cliente_sem_cadastro.nome": { $regex: searchTerm, $options: "i" },
          },
        ];
      } else if (searchType === "responsavel") {
        filtros.responsavel = { $regex: searchTerm, $options: "i" };
      } else {
        const codigoNumerico = parseInt(searchTerm, 10);
        filtros.$or = [
          ...(!isNaN(codigoNumerico) ? [{ codigo_os: codigoNumerico }] : []),
          { codigo_os: { $regex: searchTerm, $options: "i" } },
          { "cliente.nome": { $regex: searchTerm, $options: "i" } },
          {
            "cliente_sem_cadastro.nome": { $regex: searchTerm, $options: "i" },
          },
          { responsavel: { $regex: searchTerm, $options: "i" } },
        ];
      }
    }

    // Log para debug

    // Consulta ao banco de dados
    const lista = await Os.find(filtros)
      .skip(skip)
      .limit(limitNumber)
      .populate({
        path: "cliente",
        select: "nome codigo_cliente",
        match: { codigo_empresa, codigo_loja },
      })
      .sort({ dataAbertura: -1 });

    const total = await Os.countDocuments(filtros);

    if (lista.length === 0 && searchTerm) {
      return res.status(404).json({
        message:
          "Nenhuma ordem de serviço encontrada para os filtros fornecidos.",
        total: 0,
        page: pageNumber,
        limit: limitNumber,
        totalPages: 0,
        data: [],
      });
    }

    res.status(200).json({
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      data: lista,
    });
  } catch (error) {
    console.error("Erro ao listar OS:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.createOs = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const {
      codigo_loja,
      codigo_empresa,
      codigo_os,
      cliente,
      cliente_sem_cadastro,
      status,
      dataAbertura,
      dataFechamento,
      responsavel,
      telefone,
      email,
      placaVeiculo,
      marcaVeiculo,
      modeloVeiculo,
      anoVeiculo,
      corVeiculo,
      observacaoVeiculo,
      itens,
      servicos,
      forma_pagamento,
      parcelas,
      codigo_movimento,
      observacaoGeral,
    } = req.body;

    if (!codigo_loja || !codigo_empresa || !codigo_os) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "Os campos codigo_loja, codigo_empresa e codigo_os são obrigatórios.",
      });
    }

    if (status === "faturado") {
      const caixa = await Caixa.findOne({
        codigo_loja,
        codigo_empresa,
        status: "aberto",
      }).session(session);

      if (!caixa) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "O caixa precisa estar aberto para faturar a ordem de serviço."
        });
      }
    }

    const novaOs = new Os({
      codigo_loja,
      codigo_empresa,
      codigo_os,
      cliente: cliente || undefined,
      cliente_sem_cadastro: cliente_sem_cadastro || undefined,
      status: status || "pendente",
      dataAbertura: dataAbertura ? new Date(dataAbertura) : new Date(),
      dataFechamento: dataFechamento ? new Date(dataFechamento) : null,
      responsavel,
      telefone,
      email,
      placaVeiculo,
      marcaVeiculo,
      modeloVeiculo,
      anoVeiculo,
      corVeiculo,
      observacaoVeiculo,
      itens,
      servicos,
      forma_pagamento,
      observacaoGeral,
      parcelas,
    });

    if (status === "faturado") {
      const caixa = await Caixa.findOne({
        codigo_loja,
        codigo_empresa,
        status: "aberto",
      }).session(session);

      const movimentacoes = forma_pagamento.map(
        (pagamento) =>
          new Movimentacao({
            codigo_loja,
            codigo_empresa,
            caixaId: caixa._id,
            codigo_movimento,
            caixa: caixa.caixa,
            codigo_caixa: caixa.codigo_caixa,
            tipo_movimentacao: "entrada",
            valor: pagamento.valor_pagamento,
            meio_pagamento: pagamento.meio_pagamento,
            documento_origem: novaOs.codigo_os,
            origem: "os",
            categoria_contabil: "1.1.1",
          })
      );

      const recebimentos = [];
      if (parcelas && parcelas.length > 0) {
        for (let i = 0; i < parcelas.length; i++) {
          const parcela = parcelas[i];
          const { valor_total, data_vencimento, observacao, meio_pagamento } = parcela;

          if (!valor_total || valor_total <= 0) {
            throw new Error(`Valor total inválido na parcela ${i + 1}`);
          }

          const timestamp = Date.now();
          const codigo_receber = parseInt(`${novaOs.codigo_os}${i + 1}${timestamp.toString().slice(-6)}`);

          const novoReceber = new Receber({
            codigo_loja,
            codigo_empresa,
            cliente,
            origem: "os",
            documento_origem: novaOs.codigo_os,
            valor_total,
            valor_restante: valor_total,
            data_vencimento,
            codigo_receber,
            observacao,
            status: "aberto",
            fatura: `${i + 1}/${parcelas.length}`,
            meio_pagamento,
          });
          recebimentos.push(novoReceber);
        }
      }

      for (const item of itens) {
        const produto = await Produto.findOne({
          codigo_loja,
          codigo_empresa,
          codigo_produto: item.codigo_produto,
        }).session(session);

        if (!produto) {
          throw new Error(`Produto não encontrado: ${item.codigo_produto}`);
        }

        const configuracaoEstoque = produto.configuracoes[0]?.controla_estoque || "SIM";

        if (configuracaoEstoque === "SIM") {
          if (produto.estoque[0].estoque < item.quantidade) {
            throw new Error(
              `Estoque insuficiente para o produto ${produto.descricao}. Estoque atual: ${produto.estoque[0].estoque}, Quantidade solicitada: ${item.quantidade}`
            );
          }
          produto.estoque[0].estoque -= item.quantidade;
        } else if (configuracaoEstoque === "PERMITE_NEGATIVO") {
          produto.estoque[0].estoque -= item.quantidade;
        } else if (configuracaoEstoque === "NAO") {
          continue;
        }

        await produto.save({ session });
      }

      await Promise.all([
        ...movimentacoes.map((mov) => mov.save({ session })),
        novaOs.save({ session }),
        ...recebimentos.map((receb) => receb.save({ session })),
      ]);

    } else {
      await novaOs.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json({
      message: "Ordem de Serviço criada com sucesso",
      os: novaOs,
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Erro ao criar OS:", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.getOsById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    // Find client by ID, validating store and company
    const Os = await Os.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    // Check if client was found
    if (!Os) {
      return res.status(404).json({
        error: "Os não encontrado para essa loja e empresa.",
      });
    }

    // Find the city based on the city code in the client's address
    const cidade = await Cidades.findOne({
      codigo: parseInt(Os.endereco.cidade, 10),
    });

    if (cidade) {
      Os.endereco.cidade = cidade.nome;
    }

    // Return found client with city name
    res.status(200).json(Os);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOs = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_loja,
      codigo_empresa,
      cliente,
      cliente_sem_cadastro,
      status,
      codigo_os,
      dataAbertura,
      dataFechamento,
      responsavel,
      telefone,
      email,
      placaVeiculo,
      marcaVeiculo,
      modeloVeiculo,
      anoVeiculo,
      corVeiculo,
      observacaoVeiculo,
      itens,
      servicos,
      forma_pagamento,
      parcelas,
      codigo_movimento,
      observacaoGeral,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const osExistente = await Os.findOne({
      codigo_os,
      codigo_loja,
      codigo_empresa,
    }).session(session);

    if (!osExistente) {
      await session.abortTransaction();
      return res.status(404).json({
        error: "Ordem de Serviço não encontrada.",
      });
    }

    if (status === "faturado") {
      const caixa = await Caixa.findOne({
        codigo_loja,
        codigo_empresa,
        status: "aberto",
      }).session(session);

      if (!caixa) {
        await session.abortTransaction();
        return res.status(400).json({
          message: "O caixa precisa estar aberto para faturar a ordem de serviço."
        });
      }
    }

    const caixaAberto = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: "aberto",
    }).session(session);

    if (osExistente.status === "faturado") {
      const todasMovimentacoes = await Movimentacao.find({
        $or: [
          { documento_origem: String(osExistente.codigo_os) },
          { documento_origem: Number(osExistente.codigo_os) },
          { documento_origem: osExistente.codigo_os }
        ],
        origem: "os",
        codigo_loja,
        codigo_empresa,
      }).session(session);

      let movimentacaoCorreta = null;

      if (caixaAberto) {
        movimentacaoCorreta = todasMovimentacoes.find(mov =>
          mov.caixaId.toString() === caixaAberto._id.toString()
        );

        if (!movimentacaoCorreta) {
          const primeiraMovimentacao = todasMovimentacoes[0];

          if (primeiraMovimentacao) {
            const saoIguais = String(primeiraMovimentacao.codigo_caixa) === String(caixaAberto.codigo_caixa);

            if (!saoIguais) {
              await session.abortTransaction();
              return res.status(400).json({
                message: `Alteração só é permitida no mesmo caixa. OS foi faturada no Caixa ${primeiraMovimentacao.codigo_caixa}, mas o caixa atual é ${caixaAberto.codigo_caixa}.`
              });
            }
          }
        }
      }

      for (const item of osExistente.itens) {
        const produto = await Produto.findOne({
          codigo_loja,
          codigo_empresa,
          codigo_produto: item.codigo_produto,
        }).session(session);

        if (produto) {
          const configuracaoEstoque = produto.configuracoes[0]?.controla_estoque || "SIM";

          if (configuracaoEstoque === "SIM" || configuracaoEstoque === "PERMITE_NEGATIVO") {
            produto.estoque[0].estoque += item.quantidade;
            await produto.save({ session });
          }
        }
      }

      await Movimentacao.deleteMany({
        $or: [
          { documento_origem: String(codigo_os) },
          { documento_origem: Number(codigo_os) },
          { documento_origem: codigo_os }
        ],
        origem: "os",
        codigo_loja,
        codigo_empresa,
      }).session(session);

      await Receber.deleteMany({
        $or: [
          { documento_origem: String(codigo_os) },
          { documento_origem: Number(codigo_os) },
          { documento_origem: codigo_os }
        ],
        origem: "os",
        codigo_loja,
        codigo_empresa,
      }).session(session);
    }

    if (status === "faturado") {
      for (const item of itens) {
        const produto = await Produto.findOne({
          codigo_loja,
          codigo_empresa,
          codigo_produto: item.codigo_produto,
        }).session(session);

        if (!produto) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `Produto não encontrado: ${item.codigo_produto}`,
          });
        }

        const configuracaoEstoque = produto.configuracoes[0]?.controla_estoque || "SIM";

        if (configuracaoEstoque === "SIM") {
          if (produto.estoque[0].estoque < item.quantidade) {
            await session.abortTransaction();
            return res.status(400).json({
              message: `Estoque insuficiente para o produto ${produto.descricao}. Estoque atual: ${produto.estoque[0].estoque}, Quantidade solicitada: ${item.quantidade}`,
            });
          }
          produto.estoque[0].estoque -= item.quantidade;
        } else if (configuracaoEstoque === "PERMITE_NEGATIVO") {
          produto.estoque[0].estoque -= item.quantidade;
        }

        if (configuracaoEstoque !== "NAO") {
          await produto.save({ session });
        }
      }

      if (forma_pagamento && forma_pagamento.length > 0) {
        for (const pagamento of forma_pagamento) {
          const novaMovimentacao = new Movimentacao({
            codigo_loja,
            codigo_empresa,
            caixaId: caixaAberto._id,
            caixa: caixaAberto.caixa,
            codigo_movimento,
            codigo_caixa: caixaAberto.codigo_caixa,
            tipo_movimentacao: "entrada",
            valor: pagamento.valor_pagamento,
            meio_pagamento: pagamento.meio_pagamento,
            documento_origem: String(codigo_os),
            origem: "os",
            categoria_contabil: "1.1.1",
            historico: "Alteração de OS",
          });
          await novaMovimentacao.save({ session });
        }
      }

      // Processar parcelas separadamente na atualização
      if (parcelas && parcelas.length > 0) {
        for (let i = 0; i < parcelas.length; i++) {
          const parcela = parcelas[i];

          if (!parcela.valor_total || parcela.valor_total <= 0) {
            await session.abortTransaction();
            return res.status(400).json({
              message: `Valor total inválido na parcela ${i + 1}`,
            });
          }

          const timestamp = Date.now();
          const codigo_receber = parseInt(`${codigo_os}${i + 1}${timestamp.toString().slice(-6)}`);

          const novaParcela = new Receber({
            codigo_loja,
            codigo_empresa,
            cliente,
            codigo_receber,
            documento_origem: String(codigo_os),
            origem: "os",
            valor_restante: parcela.valor_total,
            valor_total: parcela.valor_total,
            status: "aberto",
            data_vencimento: parcela.data_vencimento,
            observacao: parcela.observacao,
            fatura: `${i + 1}/${parcelas.length}`,
            meio_pagamento: parcela.meio_pagamento,
          });
          await novaParcela.save({ session });
        }
      }
    }

    osExistente.cliente = cliente || osExistente.cliente;
    osExistente.cliente_sem_cadastro = cliente_sem_cadastro || osExistente.cliente_sem_cadastro;
    osExistente.status = status || osExistente.status;
    osExistente.dataAbertura = dataAbertura ? new Date(dataAbertura) : osExistente.dataAbertura;
    osExistente.dataFechamento = dataFechamento ? new Date(dataFechamento) : osExistente.dataFechamento;
    osExistente.responsavel = responsavel || osExistente.responsavel;
    osExistente.telefone = telefone || osExistente.telefone;
    osExistente.email = email || osExistente.email;
    osExistente.placaVeiculo = placaVeiculo || osExistente.placaVeiculo;
    osExistente.marcaVeiculo = marcaVeiculo || osExistente.marcaVeiculo;
    osExistente.modeloVeiculo = modeloVeiculo || osExistente.modeloVeiculo;
    osExistente.anoVeiculo = anoVeiculo || osExistente.anoVeiculo;
    osExistente.corVeiculo = corVeiculo || osExistente.corVeiculo;
    osExistente.observacaoVeiculo = observacaoVeiculo || osExistente.observacaoVeiculo;
    osExistente.itens = itens || osExistente.itens;
    osExistente.servicos = servicos || osExistente.servicos;
    osExistente.forma_pagamento = forma_pagamento || osExistente.forma_pagamento;
    osExistente.parcelas = parcelas || osExistente.parcelas;
    osExistente.observacaoGeral = observacaoGeral || osExistente.observacaoGeral;

    await osExistente.save({ session });
    await session.commitTransaction();

    return res.status(200).json({
      message: "Ordem de Serviço atualizada com sucesso.",
      os: osExistente,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Erro ao atualizar OS:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.cancelarOs = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { codigo_loja, codigo_empresa, codigo_os, codigo_movimento } = req.body;

    if (!codigo_loja || !codigo_empresa || !codigo_os) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "Os campos codigo_loja, codigo_empresa e codigo_os são obrigatórios.",
      });
    }

    const os = await Os.findOne({
      codigo_os,
      codigo_loja,
      codigo_empresa,
    }).session(session);

    if (!os) {
      await session.abortTransaction();
      return res.status(404).json({
        error: "A ordem de serviço não foi encontrada nessa loja e empresa.",
      });
    }

    if (os.status === "cancelada") {
      await session.abortTransaction();
      return res.status(400).json({
        error: "A ordem de serviço já está cancelada.",
      });
    }

    for (const item of os.itens) {
      const produto = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_produto: item.codigo_produto,
      }).session(session);

      if (produto) {
        const configuracaoEstoque = produto.configuracoes[0]?.controla_estoque || "SIM";
        if (configuracaoEstoque === "SIM" || configuracaoEstoque === "PERMITE_NEGATIVO") {
          produto.estoque[0].estoque += item.quantidade;
          await produto.save({ session });
        }
      }
    }

    if (os.parcelas && os.parcelas.length > 0) {
      await Receber.updateMany(
        {
          $or: [
            { documento_origem: String(os.codigo_os) },
            { documento_origem: Number(os.codigo_os) },
            { documento_origem: os.codigo_os }
          ],
          origem: "os",
          status: "aberto",
          codigo_loja,
          codigo_empresa,
        },
        { 
          status: "cancelado",
          data_cancelamento: new Date(),
          observacao_cancelamento: "OS cancelada"
        },
        { session }
      );
    }

    const movimentacoes = await Movimentacao.find({
      $or: [
        { documento_origem: String(os.codigo_os) },
        { documento_origem: Number(os.codigo_os) },
        { documento_origem: os.codigo_os }
      ],
      codigo_loja,
      codigo_empresa,
      origem: "os",
    }).session(session);

    console.log(movimentacoes);

    const caixaAtual = await Caixa.findOne({
      codigo_loja: os.codigo_loja,
      codigo_empresa: os.codigo_empresa,
      status: "aberto",
    }).session(session);

    console.log(caixaAtual);

    if (!caixaAtual) {
      await session.abortTransaction();
      return res.status(400).json({ 
        message: "Nenhum caixa aberto encontrado para realizar o cancelamento" 
      });
    }

    for (const movimentacao of movimentacoes) {
      if (movimentacao.caixaId.toString() !== caixaAtual._id.toString()) {
        const novaMovimentacao = new Movimentacao({
          codigo_loja: os.codigo_loja,
          codigo_empresa: os.codigo_empresa,
          codigo_movimento: codigo_movimento || Date.now(),
          caixaId: caixaAtual._id,
          caixa: caixaAtual.caixa,
          codigo_caixa: caixaAtual.codigo_caixa,
          tipo_movimentacao: "saida",
          valor: movimentacao.valor,
          meio_pagamento: movimentacao.meio_pagamento,
          documento_origem: os.codigo_os,
          origem: "os",
          categoria_contabil: "estorno",
          historico: "Cancelamento de OS",
        });

        await novaMovimentacao.save({ session });
      } else {
        movimentacao.tipo_movimentacao = "saida";
        movimentacao.categoria_contabil = "estorno";
        movimentacao.historico = "Cancelamento de OS";
        await movimentacao.save({ session });
      }
    }

    os.status = "cancelada";
    await os.save({ session });

    if (movimentacoes.length > 0) {
      caixaAtual.saldo -= movimentacoes.reduce(
        (total, mov) => total + mov.valor,
        0
      );
      await caixaAtual.save({ session });
    }

    await session.commitTransaction();

    res.status(200).json({ 
      message: "Ordem de serviço cancelada com sucesso",
      os: os
    });

  } catch (error) {
    await session.abortTransaction();
    console.error("Erro ao cancelar OS:", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};


  exports.generateOsPDF = async (req, res) => {
    try {
      const { codigo_loja, codigo_empresa } = req.query;

      if (!codigo_loja || !codigo_empresa) {
        console.error("Faltando codigo_loja ou codigo_empresa");
        return res.status(400).json({
          error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
        });
      }

      const loja = await Loja.findOne({
        codigo_loja,
        "empresas.codigo_empresa": codigo_empresa,
      });

      if (!loja) {
        console.error("Loja não encontrada");
        return res.status(404).json({
          error: "Loja não encontrada.",
        });
      }

      const os = await Os.findOne({
        codigo_os: req.params.id,
        codigo_loja,
        codigo_empresa,
      }).populate("cliente", "nome cpf");

      if (!os) {
        console.error("Venda não encontrada");
        return res.status(404).json({
          error: "Venda não encontrada.",
        });
      }

      // Find the logo for the specific empresa
      const empresa = loja.empresas.find(
        (emp) => emp.codigo_empresa === parseInt(codigo_empresa)
      );
      const logo = empresa ? empresa.logo : null;
      const rodape = empresa ? empresa.rodape : null;

      const templatePath = path.join(__dirname, "../views/os.ejs");
      const html = await ejs.renderFile(templatePath, {
        os,
        logo,
        rodape,
      });

      const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "domcontentloaded" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "20px",
          right: "20px",
          bottom: "20px",
          left: "20px",
        },
        preferCSSPageSize: true,
      });

      await browser.close();

      res.setHeader("Content-Disposition", "attachment; filename=venda.pdf");
      res.end(pdfBuffer);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      res.status(500).json({ error: error.message });
    }
  };