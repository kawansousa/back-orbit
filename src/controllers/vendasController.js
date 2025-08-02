const mongoose = require("mongoose");
const Venda = require("../models/vendas.model");
const Receber = require("../models/receber.model");
const Movimentacao = require("../models/movimentacoes_caixa.model");
const Caixa = require("../models/caixa.model");
const Produto = require("../models/produtos.model"); 
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const Loja = require("../models/lojas.model");

const atualizarSaldoCaixa = (caixa, formasPagamento, operacao = 'adicionar') => {
  let totalDinheiro = 0;
  
  formasPagamento.forEach(pagamento => {
    const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
    if (meioPagamento === 'dinheiro') {
      totalDinheiro += parseFloat(pagamento.valor_pagamento);
    }
  });

  if (totalDinheiro > 0) {
    const saldoAnterior = caixa.saldo_final;
    
    if (operacao === 'adicionar') {
      caixa.saldo_final = parseFloat(saldoAnterior) + parseFloat(totalDinheiro);
    } else if (operacao === 'subtrair') {
      caixa.saldo_final = parseFloat(saldoAnterior) - parseFloat(totalDinheiro);
    }
  }

  return totalDinheiro;
};

exports.criarVenda = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const {
      codigo_loja,
      codigo_empresa,
      codigo_venda,
      status,
      cliente,
      cliente_sem_cadastro,
      vendedor,
      tipo,
      observacoes,
      itens,
      forma_pagamento,
      valores,
      historico,
      parcelas,
      codigo_movimento,
      origem,
    } = req.body;

    if (
      !codigo_loja ||
      !codigo_empresa ||
      !codigo_venda ||
      !vendedor ||
      !itens ||
      !forma_pagamento
    ) {
      throw new Error("Dados de venda inválidos");
    }

    const novaVenda = new Venda({
      codigo_loja,
      codigo_empresa,
      codigo_venda,
      status,
      cliente,
      cliente_sem_cadastro,
      vendedor,
      tipo,
      observacoes,
      itens,
      forma_pagamento,
      valores,
      historico,
      parcelas,
      origem,
    });

    const caixa = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: "aberto",
    }).session(session);

    if (!caixa) {
      throw new Error("Caixa não está aberto");
    }

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
          documento_origem: novaVenda.codigo_venda,
          origem: "venda",
          categoria_contabil: "1.1.1",
        })
    );

    let totalDinheiro = 0;
    forma_pagamento.forEach(pagamento => {
      const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();
      
      if (meioPagamento === 'dinheiro') {
        totalDinheiro += parseFloat(pagamento.valor_pagamento);
      }
    });

    if (totalDinheiro > 0) {
      const saldoAnterior = caixa.saldo_final;
      caixa.saldo_final = parseFloat(saldoAnterior) + parseFloat(totalDinheiro);
    }

    const recebimentos = [];

    if (novaVenda.tipo === "aprazo") {
      for (let i = 0; i < parcelas.length; i++) {
        const { valor_total, data_vencimento, observacao, codigo_receber } =
          parcelas[i];

        if (!valor_total || valor_total <= 0) {
          throw new Error(`Valor total inválido na parcela ${i + 1}`);
        }

        const novoReceber = new Receber({
          codigo_loja,
          codigo_empresa,
          cliente,
          origem: "venda",
          documento_origem: novaVenda.codigo_venda,
          valor_total,
          valor_restante: valor_total,
          data_vencimento,
          codigo_receber,
          observacao,
          status: "aberto",
          fatura: `${i + 1}/${parcelas.length}`,
        });

        recebimentos.push(novoReceber);
      }
    }

    await Promise.all([
      ...movimentacoes.map((mov) => mov.save({ session })),
      caixa.save({ session }),
      novaVenda.save({ session }),
      ...recebimentos.map((receb) => receb.save({ session })),
    ]);

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

    await session.commitTransaction();

    res.status(201).json({
      venda: novaVenda,
      saldoCaixaAtualizado: caixa.saldo_final,
      totalDinheiroAdicionado: totalDinheiro,
      message: 'Venda criada e caixa atualizado com sucesso'
    });

  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.cancelarVenda = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { codigo_venda, codigo_loja, codigo_empresa, codigo_movimento } =
      req.body;

    if (!codigo_venda) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Código da venda não fornecido" });
    }

    const venda = await Venda.findOne({
      codigo_venda,
      codigo_loja,
      codigo_empresa,
    }).session(session);
    if (!venda) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Venda não encontrada" });
    }

    if (venda.status === "cancelado") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Venda já foi cancelada" });
    }

    for (const item of venda.itens) {
      const produto = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_produto: item.codigo_produto,
      }).session(session);

      if (produto) {
        produto.estoque[0].estoque += item.quantidade;
        await produto.save({ session });
      }
    }

    if (venda.tipo === "aprazo") {
      await Receber.updateMany(
        {
          documento_origem: venda.codigo_venda,
          origem: "venda",
          status: "aberto",
        },
        { status: "cancelado" },
        { session }
      );
    }

    const movimentacoes = await Movimentacao.find({
      documento_origem: venda.codigo_venda,
      codigo_loja,
      codigo_empresa,
      origem: "venda",
    }).session(session);


    const caixaAtual = await Caixa.findOne({
      codigo_loja: venda.codigo_loja,
      codigo_empresa: venda.codigo_empresa,
      status: "aberto",
    }).session(session);

    if (!caixaAtual) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Nenhum caixa aberto encontrado" });
    }

    for (const movimentacao of movimentacoes) {
      if (movimentacao.caixaId.toString() !== caixaAtual._id.toString()) {
        const novaMovimentacao = new Movimentacao({
          codigo_loja: venda.codigo_loja,
          codigo_empresa: venda.codigo_empresa,
          codigo_movimento,
          caixaId: caixaAtual._id,
          caixa: caixaAtual.caixa,
          codigo_caixa: caixaAtual.codigo_caixa,
          tipo_movimentacao: "saida",
          valor: movimentacao.valor,
          meio_pagamento: movimentacao.meio_pagamento,
          documento_origem: venda.codigo_venda,
          origem: "venda",
          categoria_contabil: "estorno",
          historico: "Cancelamento de venda",
        });


        await novaMovimentacao.save({ session });
      } else {
        movimentacao.tipo_movimentacao = "saida";
        movimentacao.categoria_contabil = "estorno";
        movimentacao.historico = "Cancelamento de venda";
        await movimentacao.save({ session });
      }
    }

    venda.status = "cancelado";
    await venda.save({ session });

    caixaAtual.saldo -= movimentacoes.reduce(
      (total, mov) => total + mov.valor,
      0
    );
    await caixaAtual.save({ session });

    await session.commitTransaction();

    res.status(200).json({ message: "Venda cancelada com sucesso" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.alterarVenda = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_venda,
      codigo_loja,
      codigo_empresa,
      cliente,
      vendedor,
      tipo,
      observacoes,
      itens,
      forma_pagamento,
      valores,
      historico,
      parcelas,
      codigo_movimento,
      cliente_sem_cadastro,
      origem,
    } = req.body;

    const venda = await Venda.findOne({
      codigo_venda,
      codigo_loja,
      codigo_empresa,
    }).session(session);

    if (!venda) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Venda não encontrada" });
    }

    const caixaAberto = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: "aberto",
    }).session(session);

    const movimentacoes = await Movimentacao.findOne({
      documento_origem: String(venda.codigo_venda),
      codigo_loja,
      codigo_empresa,
      origem: "venda",
    }).session(session);

    if (
      caixaAberto == null ||
      movimentacoes.codigo_caixa !== caixaAberto.codigo_caixa
    ) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Alteração só é permitida no mesmo caixa." });
    }

    const formasPagamentoAntigas = venda.forma_pagamento || [];
    const totalDinheiroRevertido = atualizarSaldoCaixa(caixaAberto, formasPagamentoAntigas, 'subtrair');

    for (const item of venda.itens) {
      const produto = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_produto: item.codigo_produto,
      }).session(session);

      if (produto) {
        produto.estoque[0].estoque += item.quantidade;
        await produto.save({ session });
      }
    }

    await Movimentacao.deleteMany({
      documento_origem: codigo_venda,
      origem: "venda",
      codigo_loja,
      codigo_empresa,
    }).session(session);

    await Receber.deleteMany({
      documento_origem: codigo_venda,
      origem: "venda",
      codigo_loja,
      codigo_empresa,
    }).session(session);

    for (const item of itens) {
      const produto = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_produto: item.codigo_produto,
      }).session(session);

      if (!produto || produto.estoque[0].estoque < item.quantidade) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Estoque insuficiente para o produto ${item.codigo_produto}`,
        });
      }

      produto.estoque[0].estoque -= item.quantidade;
      await produto.save({ session });
    }

    venda.cliente = cliente;
    venda.cliente_sem_cadastro = cliente_sem_cadastro;
    venda.vendedor = vendedor;
    venda.tipo = tipo;
    venda.observacoes = observacoes;
    venda.itens = itens;
    venda.forma_pagamento = forma_pagamento;
    venda.valores = valores;
    venda.historico = historico;
    venda.parcelas = parcelas;
    venda.origem = origem;

    await venda.save({ session });

    const totalDinheiroAdicionado = atualizarSaldoCaixa(caixaAberto, forma_pagamento, 'adicionar');

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
        documento_origem: codigo_venda,
        origem: "venda",
        categoria_contabil: "receita",
        historico: JSON.stringify(historico) || "Venda alterada",
      });

      await novaMovimentacao.save({ session });
    }

    if (tipo === "aprazo" && parcelas) {
      for (const parcela of parcelas) {
        const novaParcela = new Receber({
          codigo_loja,
          codigo_empresa,
          cliente,
          codigo_receber: parcela.codigo_receber,
          documento_origem: String(codigo_venda),
          origem: "venda",
          valor_restante: parcela.valor_total,
          valor_total: parcela.valor_total,
          status: "aberto",
          data_vencimento: parcela.data_vencimento,
        });
        await novaParcela.save({ session });
      }
    }

    await caixaAberto.save({ session });

    await session.commitTransaction();

    res.status(200).json({ 
      message: "Venda alterada com sucesso",
      saldoCaixaAtualizado: caixaAberto.saldo_final
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('Erro ao alterar venda:', error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.listarVendas = async (req, res) => {
  try {
    const {
      codigo_empresa,
      codigo_loja,
      status,
      page = 1,
      limit = 20,
      dataInicio,
      dataFim,
    } = req.query;

    if (!codigo_empresa) {
      return res.status(400).json({
        message: "Código da empresa é obrigatório",
      });
    }

    if (!codigo_loja) {
      return res.status(400).json({
        message: "Código da loja é obrigatório",
      });
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        message: "Número de página inválido",
      });
    }

    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        message: "Limite de registros inválido (deve estar entre 1 e 100)",
      });
    }

    const query = {
      codigo_empresa,
      codigo_loja,
    };

    if (status) {
      const validStatuses = ["pendente", "concluido", "cancelado"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: "Status de venda inválido",
        });
      }
      query.status = status;
    }

    if (dataInicio && dataFim) {
      const startDate = new Date(dataInicio);
      const endDate = new Date(dataFim);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          message: "Formato de data inválido",
        });
      }

      if (startDate > endDate) {
        return res.status(400).json({
          message: "Data de início deve ser anterior ou igual à data final",
        });
      }

      query.createdAt = {
        $gte: startDate,
        $lte: endDate,
      };
    }

    const skip = (pageNumber - 1) * limitNumber;

    const vendas = await Venda.find(query)
      .populate({
        path: "cliente",
        select: "nome codigo_cliente",
        match: { codigo_empresa, codigo_loja },
      })
      .populate({
        path: "vendedor",
        select: "name", 
        match: {
          acesso_loja: {
            $elemMatch: {
              codigo_loja: codigo_loja,
              "codigo_empresas.codigo": codigo_empresa,
            },
          },
        },
      })
      .sort({ codigo_venda: -1, createdAt: -1 }) 
      .skip(skip)
      .limit(limitNumber)
      .lean();

    const total = await Venda.countDocuments(query);

    res.status(200).json({
      data: vendas,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      pageSize: limitNumber,
    });
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.getVendaById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    
    const venda = await Venda.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

   
    if (!venda) {
      return res.status(404).json({
        error: "Cliente não encontrado para essa loja e empresa.",
      });
    }

    res.status(200).json(venda);
  } catch (error) {
    console.error("Erro ao listar vendas:", error);
    res.status(500).json({
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

exports.generateVendaPDF = async (req, res) => {
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

    const venda = await Venda.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    }).populate("cliente", "nome cpf");

    if (!venda) {
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

    const templatePath = path.join(__dirname, "../views/venda.ejs");
    const html = await ejs.renderFile(templatePath, {
      venda,
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
