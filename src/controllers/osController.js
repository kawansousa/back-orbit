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
const ContasBancarias = require("../models/contas_bancarias.model");

const atualizarSaldoCaixa = (
  caixa,
  formasPagamento,
  operacao = "adicionar"
) => {
  let totalDinheiro = 0;

  formasPagamento.forEach((pagamento) => {
    const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
    if (meioPagamento === "dinheiro") {
      totalDinheiro += parseFloat(pagamento.valor_pagamento);
    }
  });

  if (totalDinheiro > 0) {
    const saldoAnterior = caixa.saldo_final;

    if (operacao === "adicionar") {
      caixa.saldo_final = parseFloat(saldoAnterior) + parseFloat(totalDinheiro);
    } else if (operacao === "subtrair") {
      caixa.saldo_final = parseFloat(saldoAnterior) - parseFloat(totalDinheiro);
    }
  }

  return totalDinheiro;
};

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
    const baseMatch = { codigo_loja, codigo_empresa };

    const aggregatePipeline = [];

    aggregatePipeline.push({ $match: baseMatch });

    aggregatePipeline.push({
      $lookup: {
        from: "clientes",
        localField: "cliente",
        foreignField: "_id",
        as: "cliente_populated",
      },
    });

    aggregatePipeline.push({
      $unwind: {
        path: "$cliente_populated",
        preserveNullAndEmptyArrays: true,
      },
    });

    aggregatePipeline.push({
      $addFields: {
        cliente: {
          $cond: {
            if: { $ifNull: ["$cliente_populated", false] },
            then: {
              _id: "$cliente_populated._id",
              nome: "$cliente_populated.nome",
              codigo_cliente: "$cliente_populated.codigo_cliente",
            },
            else: "$$REMOVE",
          },
        },
      },
    });

    const orConditions = [];
    if (searchTerm && searchTerm.trim() !== "") {
      const termoBusca = searchTerm.trim();
      if (searchType === "codigo") {
        const codigoNumerico = parseInt(termoBusca, 10);
        if (!isNaN(codigoNumerico)) {
          orConditions.push({ codigo_os: codigoNumerico });
        } else {
          orConditions.push({
            codigo_os: { $regex: termoBusca, $options: "i" },
          });
        }
      } else if (searchType === "cliente") {
        orConditions.push({
          "cliente.nome": { $regex: termoBusca, $options: "i" },
        });
      } else if (searchType === "responsavel") {
        orConditions.push({
          responsavel: { $regex: termoBusca, $options: "i" },
        });
      } else {
        const codigoNumerico = parseInt(termoBusca, 10);
        if (!isNaN(codigoNumerico)) {
          orConditions.push({ codigo_os: codigoNumerico });
        }
        orConditions.push({ codigo_os: { $regex: termoBusca, $options: "i" } });
        orConditions.push({
          "cliente.nome": { $regex: termoBusca, $options: "i" },
        });
        orConditions.push({
          responsavel: { $regex: termoBusca, $options: "i" },
        });
      }
    }

    if (orConditions.length > 0) {
      aggregatePipeline.push({ $match: { $or: orConditions } });
    }

    const totalPipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "clientes",
          localField: "cliente",
          foreignField: "_id",
          as: "cliente_populated",
        },
      },
      {
        $unwind: {
          path: "$cliente_populated",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          cliente: {
            $cond: {
              if: { $ifNull: ["$cliente_populated", false] },
              then: {
                _id: "$cliente_populated._id",
                nome: "$cliente_populated.nome",
                codigo_cliente: "$cliente_populated.codigo_cliente",
              },
              else: "$cliente_sem_cadastro",
            },
          },
        },
      },
    ];

    if (orConditions.length > 0) {
      totalPipeline.push({ $match: { $or: orConditions } });
    }

    totalPipeline.push({ $count: "total" });

    const totalResult = await Os.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    aggregatePipeline.push(
      { $sort: { dataAbertura: -1 } },
      { $skip: skip },
      { $limit: limitNumber }
    );

    const lista = await Os.aggregate(aggregatePipeline);

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
  let transactionCommitted = false;

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
      throw new Error(
        "Os campos codigo_loja, codigo_empresa e codigo_os são obrigatórios."
      );
    }

    let caixa = null;
    let totalPix = 0;

    if (status === "faturado") {
      caixa = await Caixa.findOne({
        codigo_loja,
        codigo_empresa,
        status: "aberto",
      }).session(session);

      if (!caixa) {
        throw new Error(
          "O caixa precisa estar aberto para faturar a ordem de serviço."
        );
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

    const contaBancariaPadrao = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      conta_padrao: true,
    }).session(session);

    if (status === "faturado") {
      const totalDinheiroAdicionado = atualizarSaldoCaixa(
        caixa,
        forma_pagamento,
        "adicionar"
      );

      const movimentacoes = forma_pagamento.map((pagamento) => {
        const movimentacao = {
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
        };

        const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
        if (meioPagamento === "pix" && contaBancariaPadrao) {
          movimentacao.codigo_conta_bancaria =
            contaBancariaPadrao.codigo_conta_bancaria;
        }

        return new Movimentacao(movimentacao);
      });

      forma_pagamento.forEach((pagamento) => {
        const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
        if (meioPagamento === "pix") {
          totalPix += parseFloat(pagamento.valor_pagamento);
        }
      });

      if (totalPix > 0 && contaBancariaPadrao) {
        const saldoAnteriorBanco = contaBancariaPadrao.saldo || 0;
        contaBancariaPadrao.saldo =
          parseFloat(saldoAnteriorBanco) + parseFloat(totalPix);
      }

      const recebimentos = [];
      if (parcelas && parcelas.length > 0) {
        for (let i = 0; i < parcelas.length; i++) {
          const parcela = parcelas[i];
          const {
            valor_total,
            data_vencimento,
            observacao,
            meio_pagamento,
            codigo_receber,
          } = parcela;

          if (!valor_total || valor_total <= 0) {
            throw new Error(`Valor total inválido na parcela ${i + 1}`);
          }

          if (!codigo_receber) {
            throw new Error(
              `Código receber não foi gerado para a parcela ${i + 1}`
            );
          }

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

      if (itens && itens.length > 0) {
        for (const item of itens) {
          const produto = await Produto.findOne({
            codigo_loja,
            codigo_empresa,
            codigo_produto: item.codigo_produto,
          }).session(session);

          if (!produto) {
            throw new Error(`Produto não encontrado: ${item.codigo_produto}`);
          }

          const configuracaoEstoque =
            produto.configuracoes[0]?.controla_estoque || "SIM";

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
      }

      const saveOperations = [
        ...movimentacoes.map((mov) => mov.save({ session })),
        caixa.save({ session }),
        novaOs.save({ session }),
        ...recebimentos.map((receb) => receb.save({ session })),
      ];

      if (totalPix > 0 && contaBancariaPadrao) {
        saveOperations.push(contaBancariaPadrao.save({ session }));
      }

      await Promise.all(saveOperations);
    } else {
      await novaOs.save({ session });
    }

    await session.commitTransaction();
    transactionCommitted = true;

    const response = {
      message: "Ordem de Serviço criada com sucesso",
      os: novaOs,
      saldoCaixaAtualizado: caixa ? caixa.saldo_final : null,
    };

    if (status === "faturado" && totalPix > 0 && contaBancariaPadrao) {
      response.saldoContaBancariaAtualizado = contaBancariaPadrao.saldo;
      response.totalPixAdicionado = totalPix;
      response.contaBancaria = {
        codigo_conta_bancaria: contaBancariaPadrao.codigo_conta_bancaria,
        descricao:
          contaBancariaPadrao.descricao || contaBancariaPadrao.nome_banco,
      };
    }

    res.status(201).json(response);
  } catch (error) {
    if (!transactionCommitted) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Erro ao abortar transação:", abortError);
      }
    }

    console.error("Erro ao criar OS:", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.getOsById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const Os = await Os.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    if (!Os) {
      return res.status(404).json({
        error: "Os não encontrado para essa loja e empresa.",
      });
    }

    const cidade = await Cidades.findOne({
      codigo: parseInt(Os.endereco.cidade, 10),
    });

    if (cidade) {
      Os.endereco.cidade = cidade.nome;
    }

    res.status(200).json(Os);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOs = async (req, res) => {
  const session = await mongoose.startSession();
  let transactionCommitted = false;

  try {
    session.startTransaction();

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
      throw new Error(
        "Os campos codigo_loja e codigo_empresa são obrigatórios."
      );
    }

    const osExistente = await Os.findOne({
      codigo_os,
      codigo_loja,
      codigo_empresa,
    }).session(session);

    if (!osExistente) {
      throw new Error("Ordem de Serviço não encontrada.");
    }

    let caixaAberto = null;
    if (status === "faturado") {
      caixaAberto = await Caixa.findOne({
        codigo_loja,
        codigo_empresa,
        status: "aberto",
      }).session(session);

      if (!caixaAberto) {
        throw new Error(
          "O caixa precisa estar aberto para faturar a ordem de serviço."
        );
      }
    } else {
      caixaAberto = await Caixa.findOne({
        codigo_loja,
        codigo_empresa,
        status: "aberto",
      }).session(session);
    }

    const contaBancariaPadrao = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      conta_padrao: true,
    }).session(session);

    let totalPixAntigo = 0;
    let totalPixNovo = 0;

    if (osExistente.status === "faturado") {
      const todasMovimentacoes = await Movimentacao.find({
        $or: [
          { documento_origem: String(osExistente.codigo_os) },
          { documento_origem: Number(osExistente.codigo_os) },
          { documento_origem: osExistente.codigo_os },
        ],
        origem: "os",
        codigo_loja,
        codigo_empresa,
      }).session(session);

      let movimentacaoCorreta = null;

      if (caixaAberto) {
        movimentacaoCorreta = todasMovimentacoes.find(
          (mov) => mov.caixaId.toString() === caixaAberto._id.toString()
        );

        if (!movimentacaoCorreta) {
          const primeiraMovimentacao = todasMovimentacoes[0];

          if (primeiraMovimentacao) {
            const saoIguais =
              String(primeiraMovimentacao.codigo_caixa) ===
              String(caixaAberto.codigo_caixa);

            if (!saoIguais) {
              throw new Error(
                `Alteração só é permitida no mesmo caixa. OS foi faturada no Caixa ${primeiraMovimentacao.codigo_caixa}, mas o caixa atual é ${caixaAberto.codigo_caixa}.`
              );
            }
          }
        }

        const formasPagamentoAntigas = osExistente.forma_pagamento || [];
        const totalDinheiroRevertido = atualizarSaldoCaixa(
          caixaAberto,
          formasPagamentoAntigas,
          "subtrair"
        );

        formasPagamentoAntigas.forEach((pagamento) => {
          const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
          if (meioPagamento === "pix") {
            totalPixAntigo += parseFloat(pagamento.valor_pagamento);
          }
        });

        if (totalPixAntigo > 0 && contaBancariaPadrao) {
          const saldoAnteriorBanco = contaBancariaPadrao.saldo || 0;
          contaBancariaPadrao.saldo =
            parseFloat(saldoAnteriorBanco) - totalPixAntigo;
        }
      }

      for (const item of osExistente.itens) {
        const produto = await Produto.findOne({
          codigo_loja,
          codigo_empresa,
          codigo_produto: item.codigo_produto,
        }).session(session);

        if (produto) {
          const configuracaoEstoque =
            produto.configuracoes[0]?.controla_estoque || "SIM";

          if (
            configuracaoEstoque === "SIM" ||
            configuracaoEstoque === "PERMITE_NEGATIVO"
          ) {
            produto.estoque[0].estoque += item.quantidade;
            await produto.save({ session });
          }
        }
      }

      await Movimentacao.deleteMany({
        $or: [
          { documento_origem: String(codigo_os) },
          { documento_origem: Number(codigo_os) },
          { documento_origem: codigo_os },
        ],
        origem: "os",
        codigo_loja,
        codigo_empresa,
      }).session(session);

      await Receber.deleteMany({
        $or: [
          { documento_origem: String(codigo_os) },
          { documento_origem: Number(codigo_os) },
          { documento_origem: codigo_os },
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
          throw new Error(`Produto não encontrado: ${item.codigo_produto}`);
        }

        const configuracaoEstoque =
          produto.configuracoes[0]?.controla_estoque || "SIM";

        if (configuracaoEstoque === "SIM") {
          if (produto.estoque[0].estoque < item.quantidade) {
            throw new Error(
              `Estoque insuficiente para o produto ${produto.descricao}. Estoque atual: ${produto.estoque[0].estoque}, Quantidade solicitada: ${item.quantidade}`
            );
          }
          produto.estoque[0].estoque -= item.quantidade;
        } else if (configuracaoEstoque === "PERMITE_NEGATIVO") {
          produto.estoque[0].estoque -= item.quantidade;
        }

        if (configuracaoEstoque !== "NAO") {
          await produto.save({ session });
        }
      }

      if (caixaAberto) {
        const totalDinheiroAdicionado = atualizarSaldoCaixa(
          caixaAberto,
          forma_pagamento,
          "adicionar"
        );

        forma_pagamento.forEach((pagamento) => {
          const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
          if (meioPagamento === "pix") {
            totalPixNovo += parseFloat(pagamento.valor_pagamento);
          }
        });

        if (totalPixNovo > 0 && contaBancariaPadrao) {
          const saldoAnteriorBanco = contaBancariaPadrao.saldo || 0;
          contaBancariaPadrao.saldo =
            parseFloat(saldoAnteriorBanco) + totalPixNovo;
        }
      }

      if (forma_pagamento && forma_pagamento.length > 0) {
        for (const pagamento of forma_pagamento) {
          const movimentacao = {
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
          };

          const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
          if (meioPagamento === "pix" && contaBancariaPadrao) {
            movimentacao.codigo_conta_bancaria =
              contaBancariaPadrao.codigo_conta_bancaria;
          }

          const novaMovimentacao = new Movimentacao(movimentacao);
          await novaMovimentacao.save({ session });
        }
      }

      if (parcelas && parcelas.length > 0) {
        for (let i = 0; i < parcelas.length; i++) {
          const parcela = parcelas[i];

          if (!parcela.valor_total || parcela.valor_total <= 0) {
            throw new Error(`Valor total inválido na parcela ${i + 1}`);
          }

          if (!parcela.codigo_receber) {
            throw new Error(
              `Código receber não foi gerado para a parcela ${i + 1}`
            );
          }

          const novaParcela = new Receber({
            codigo_loja,
            codigo_empresa,
            cliente,
            codigo_receber: parcela.codigo_receber,
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
    osExistente.cliente_sem_cadastro =
      cliente_sem_cadastro || osExistente.cliente_sem_cadastro;
    osExistente.status = status || osExistente.status;
    osExistente.dataAbertura = dataAbertura
      ? new Date(dataAbertura)
      : osExistente.dataAbertura;
    osExistente.dataFechamento = dataFechamento
      ? new Date(dataFechamento)
      : osExistente.dataFechamento;
    osExistente.responsavel = responsavel || osExistente.responsavel;
    osExistente.telefone = telefone || osExistente.telefone;
    osExistente.email = email || osExistente.email;
    osExistente.placaVeiculo = placaVeiculo || osExistente.placaVeiculo;
    osExistente.marcaVeiculo = marcaVeiculo || osExistente.marcaVeiculo;
    osExistente.modeloVeiculo = modeloVeiculo || osExistente.modeloVeiculo;
    osExistente.anoVeiculo = anoVeiculo || osExistente.anoVeiculo;
    osExistente.corVeiculo = corVeiculo || osExistente.corVeiculo;
    osExistente.observacaoVeiculo =
      observacaoVeiculo || osExistente.observacaoVeiculo;
    osExistente.itens = itens || osExistente.itens;
    osExistente.servicos = servicos || osExistente.servicos;
    osExistente.forma_pagamento =
      forma_pagamento || osExistente.forma_pagamento;
    osExistente.parcelas = parcelas || osExistente.parcelas;
    osExistente.observacaoGeral =
      observacaoGeral || osExistente.observacaoGeral;

    const saveOperations = [osExistente.save({ session })];

    if (caixaAberto) {
      saveOperations.push(caixaAberto.save({ session }));
    }

    if (contaBancariaPadrao && (totalPixAntigo > 0 || totalPixNovo > 0)) {
      saveOperations.push(contaBancariaPadrao.save({ session }));
    }

    await Promise.all(saveOperations);

    await session.commitTransaction();
    transactionCommitted = true;

    const response = {
      message: "Ordem de Serviço atualizada com sucesso.",
      os: osExistente,
      saldoCaixaAtualizado: caixaAberto ? caixaAberto.saldo_final : null,
    };

    if (contaBancariaPadrao && (totalPixAntigo > 0 || totalPixNovo > 0)) {
      response.saldoContaBancariaAtualizado = contaBancariaPadrao.saldo;
      response.totalPixEstornado = totalPixAntigo;
      response.totalPixAdicionado = totalPixNovo;
      response.contaBancaria = {
        codigo_conta_bancaria: contaBancariaPadrao.codigo_conta_bancaria,
        descricao:
          contaBancariaPadrao.descricao || contaBancariaPadrao.nome_banco,
      };
    }

    return res.status(200).json(response);
  } catch (error) {
    if (!transactionCommitted) {
      try {
        await session.abortTransaction();
      } catch (abortError) {
        console.error("Erro ao abortar transação:", abortError);
      }
    }
    console.error("Erro ao atualizar OS:", error);
    return res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.cancelarOs = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const { codigo_loja, codigo_empresa, codigo_os, codigo_movimento } =
      req.body;

    if (!codigo_loja || !codigo_empresa || !codigo_os) {
      throw new Error(
        "Os campos codigo_loja, codigo_empresa e codigo_os são obrigatórios."
      );
    }

    const os = await Os.findOne({
      codigo_os,
      codigo_loja,
      codigo_empresa,
    }).session(session);

    if (!os) {
      throw new Error(
        "A ordem de serviço não foi encontrada nessa loja e empresa."
      );
    }

    if (os.status === "cancelada") {
      throw new Error("A ordem de serviço já está cancelada.");
    }

    const caixaAtual = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: "aberto",
    }).session(session);

    if (!caixaAtual) {
      throw new Error(
        "Nenhum caixa aberto encontrado para realizar o cancelamento."
      );
    }

    const contaBancariaPadrao = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      conta_padrao: true,
    }).session(session);

    let totalDinheiro = 0;
    let totalPix = 0;

    if (os.forma_pagamento && os.forma_pagamento.length > 0) {
      os.forma_pagamento.forEach((pagamento) => {
        const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
        const valor = parseFloat(pagamento.valor_pagamento);

        if (meioPagamento === "dinheiro") {
          totalDinheiro += valor;
        } else if (meioPagamento === "pix") {
          totalPix += valor;
        }
      });
    }

    if (totalDinheiro > 0) {
      if (caixaAtual.saldo_final < totalDinheiro) {
        throw new Error(
          `Saldo insuficiente no caixa para estornar. Saldo atual: ${caixaAtual.saldo_final}, Valor a estornar: ${totalDinheiro}`
        );
      }
    }

    if (totalPix > 0 && contaBancariaPadrao) {
      const saldoAtual = contaBancariaPadrao.saldo || 0;
      if (saldoAtual < totalPix) {
        throw new Error(
          `Saldo insuficiente na conta bancária para estornar PIX. Saldo atual: ${saldoAtual}, Valor a estornar: ${totalPix}`
        );
      }
    }

    if (os.itens && os.itens.length > 0) {
      for (const item of os.itens) {
        const produto = await Produto.findOne({
          codigo_loja,
          codigo_empresa,
          codigo_produto: item.codigo_produto,
        }).session(session);

        if (produto) {
          const configuracaoEstoque =
            produto.configuracoes[0]?.controla_estoque || "SIM";

          if (
            configuracaoEstoque === "SIM" ||
            configuracaoEstoque === "PERMITE_NEGATIVO"
          ) {
            produto.estoque[0].estoque += item.quantidade;
            await produto.save({ session });
          }
        }
      }
    }

    if (os.parcelas && os.parcelas.length > 0) {
      await Receber.updateMany(
        {
          $or: [
            { documento_origem: String(os.codigo_os) },
            { documento_origem: Number(os.codigo_os) },
            { documento_origem: os.codigo_os },
          ],
          origem: "os",
          status: "aberto",
          codigo_loja,
          codigo_empresa,
        },
        {
          status: "cancelado",
          data_cancelamento: new Date(),
          observacao_cancelamento: "OS cancelada",
        },
        { session }
      );
    }

    const movimentacoesEstorno = [];

    if (os.forma_pagamento && os.forma_pagamento.length > 0) {
      os.forma_pagamento.forEach((pagamento) => {
        const movimentacao = {
          codigo_loja,
          codigo_empresa,
          caixaId: caixaAtual._id,
          codigo_movimento: codigo_movimento || Date.now(),
          caixa: caixaAtual.caixa,
          codigo_caixa: caixaAtual.codigo_caixa,
          tipo_movimentacao: "saida",
          valor: pagamento.valor_pagamento,
          meio_pagamento: pagamento.meio_pagamento,
          documento_origem: os.codigo_os,
          origem: "cancelamento_os",
          categoria_contabil: "estorno",
          observacao: `Estorno da OS ${os.codigo_os}`,
        };

        const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
        if (meioPagamento === "pix" && contaBancariaPadrao) {
          movimentacao.codigo_conta_bancaria =
            contaBancariaPadrao.codigo_conta_bancaria;
        }

        movimentacoesEstorno.push(new Movimentacao(movimentacao));
      });
    }

    if (totalDinheiro > 0) {
      caixaAtual.saldo_final =
        parseFloat(caixaAtual.saldo_final) - totalDinheiro;
    }

    if (totalPix > 0 && contaBancariaPadrao) {
      const saldoAnteriorBanco = contaBancariaPadrao.saldo || 0;
      contaBancariaPadrao.saldo = parseFloat(saldoAnteriorBanco) - totalPix;
    }

    os.status = "cancelada";
    os.data_cancelamento = new Date();
    os.motivo_cancelamento =
      req.body.motivo_cancelamento || "Cancelamento manual";

    const saveOperations = [
      ...movimentacoesEstorno.map((mov) => mov.save({ session })),
      caixaAtual.save({ session }),
      os.save({ session }),
    ];

    if (totalPix > 0 && contaBancariaPadrao) {
      saveOperations.push(contaBancariaPadrao.save({ session }));
    }

    await Promise.all(saveOperations);

    await session.commitTransaction();

    const response = {
      message: "Ordem de serviço cancelada com sucesso",
      os: os,
      saldoCaixaAtualizado: caixaAtual.saldo_final,
      totalDinheiroEstornado: totalDinheiro,
    };

    if (totalPix > 0 && contaBancariaPadrao) {
      response.saldoContaBancariaAtualizado = contaBancariaPadrao.saldo;
      response.totalPixEstornado = totalPix;
      response.contaBancaria = {
        codigo_conta_bancaria: contaBancariaPadrao.codigo_conta_bancaria,
        descricao:
          contaBancariaPadrao.descricao || contaBancariaPadrao.nome_banco,
      };
    }

    res.status(200).json(response);
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
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
