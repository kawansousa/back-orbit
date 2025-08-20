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
    forma_pagamento.forEach((pagamento) => {
      const meioPagamento = pagamento.meio_pagamento.toLowerCase().trim();

      if (meioPagamento === "dinheiro") {
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
      message: "Venda criada e caixa atualizado com sucesso",
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

    if (!codigo_loja || !codigo_empresa) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const vendaExistente = await Venda.findOne({
      codigo_venda,
      codigo_loja,
      codigo_empresa,
    }).session(session);

    if (!vendaExistente) {
      await session.abortTransaction();
      return res.status(404).json({
        error: "Venda não encontrada.",
      });
    }

    const caixaAberto = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: "aberto",
    }).session(session);

    const todasMovimentacoes = await Movimentacao.find({
      $or: [
        { documento_origem: String(vendaExistente.codigo_venda) },
        { documento_origem: Number(vendaExistente.codigo_venda) },
        { documento_origem: vendaExistente.codigo_venda },
      ],
      origem: "venda",
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
            await session.abortTransaction();
            return res.status(400).json({
              message: `Alteração só é permitida no mesmo caixa. Venda foi realizada no Caixa ${primeiraMovimentacao.codigo_caixa}, mas o caixa atual é ${caixaAberto.codigo_caixa}.`,
            });
          }
        }
      }

      const formasPagamentoAntigas = vendaExistente.forma_pagamento || [];
      const totalDinheiroRevertido = atualizarSaldoCaixa(
        caixaAberto,
        formasPagamentoAntigas,
        "subtrair"
      );
    }

    for (const item of vendaExistente.itens) {
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
        { documento_origem: String(codigo_venda) },
        { documento_origem: Number(codigo_venda) },
        { documento_origem: codigo_venda },
      ],
      origem: "venda",
      codigo_loja,
      codigo_empresa,
    }).session(session);

    await Receber.deleteMany({
      $or: [
        { documento_origem: String(codigo_venda) },
        { documento_origem: Number(codigo_venda) },
        { documento_origem: codigo_venda },
      ],
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

      if (!produto) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Produto não encontrado: ${item.codigo_produto}`,
        });
      }

      const configuracaoEstoque =
        produto.configuracoes[0]?.controla_estoque || "SIM";

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

    vendaExistente.cliente = cliente || vendaExistente.cliente;
    vendaExistente.cliente_sem_cadastro =
      cliente_sem_cadastro || vendaExistente.cliente_sem_cadastro;
    vendaExistente.vendedor = vendedor || vendaExistente.vendedor;
    vendaExistente.tipo = tipo || vendaExistente.tipo;
    vendaExistente.observacoes = observacoes || vendaExistente.observacoes;
    vendaExistente.itens = itens || vendaExistente.itens;
    vendaExistente.forma_pagamento =
      forma_pagamento || vendaExistente.forma_pagamento;
    vendaExistente.valores = valores || vendaExistente.valores;
    vendaExistente.historico = historico || vendaExistente.historico;
    vendaExistente.parcelas = parcelas || vendaExistente.parcelas;
    vendaExistente.origem = origem || vendaExistente.origem;

    await vendaExistente.save({ session });

    if (caixaAberto) {
      const totalDinheiroAdicionado = atualizarSaldoCaixa(
        caixaAberto,
        forma_pagamento,
        "adicionar"
      );
    }

    if (forma_pagamento && forma_pagamento.length > 0) {
      for (const pagamento of forma_pagamento) {
        const novaMovimentacao = new Movimentacao({
          codigo_loja,
          codigo_empresa,
          caixaId: caixaAberto?._id,
          caixa: caixaAberto?.caixa,
          codigo_movimento,
          codigo_caixa: caixaAberto?.codigo_caixa,
          tipo_movimentacao: "entrada",
          valor: pagamento.valor_pagamento,
          meio_pagamento: pagamento.meio_pagamento,
          documento_origem: String(codigo_venda),
          origem: "venda",
          categoria_contabil: "receita",
          historico: JSON.stringify(historico) || "Venda alterada",
        });
        await novaMovimentacao.save({ session });
      }
    }

    if (tipo === "aprazo" && parcelas && parcelas.length > 0) {
      for (let i = 0; i < parcelas.length; i++) {
        const parcela = parcelas[i];

        if (!parcela.valor_total || parcela.valor_total <= 0) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `Valor total inválido na parcela ${i + 1}`,
          });
        }

        if (!parcela.codigo_receber) {
          await session.abortTransaction();
          return res.status(400).json({
            message: `Código receber não foi gerado para a parcela ${i + 1}`,
          });
        }

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
          observacao: parcela.observacao,
          fatura: `${i + 1}/${parcelas.length}`,
          meio_pagamento: parcela.meio_pagamento,
        });
        await novaParcela.save({ session });
      }
    }

    if (caixaAberto) {
      await caixaAberto.save({ session });
    }

    await session.commitTransaction();

    return res.status(200).json({
      message: "Venda alterada com sucesso.",
      venda: vendaExistente,
      saldoCaixaAtualizado: caixaAberto ? caixaAberto.saldo_final : null,
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Erro ao alterar venda:", error);
    return res.status(500).json({ error: error.message });
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
      searchTerm,
      searchType,
    } = req.query;

    if (!codigo_empresa) {
      return res
        .status(400)
        .json({ message: "Código da empresa é obrigatório" });
    }
    if (!codigo_loja) {
      return res.status(400).json({ message: "Código da loja é obrigatório" });
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({ message: "Número de página inválido" });
    }
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        message: "Limite de registros inválido (deve estar entre 1 e 100)",
      });
    }

    const baseMatch = {
      codigo_empresa,
      codigo_loja,
      ...(status ? { status } : {}),
      ...(dataInicio || dataFim
        ? {
            data_emissao: {
              ...(dataInicio ? { $gte: new Date(dataInicio) } : {}),
              ...(dataFim ? { $lte: new Date(dataFim) } : {}),
            },
          }
        : {}),
    };

    if (!searchTerm || searchTerm.trim() === "") {
      const vendas = await Venda.find(baseMatch)
        .populate({
          path: "cliente",
          select: "nome codigo_cliente",
        })
        .sort({ codigo_venda: -1, data_emissao: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean();

      const total = await Venda.countDocuments(baseMatch);

      return res.status(200).json({
        data: vendas,
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        pageSize: limitNumber,
      });
    }

    const termoBusca = searchTerm.trim();
    const validSearchTypes = [
      "todos",
      "codigo_venda",
      "cliente",
      "vendedor",
      "tipo",
    ];

    if (!validSearchTypes.includes(searchType)) {
      return res.status(400).json({
        error:
          "Tipo de busca inválido. Use: todos, cliente, vendedor, tipo ou codigo_venda",
      });
    }

    if (searchType === "codigo_venda" && !isNaN(termoBusca)) {
      const query = {
        ...baseMatch,
        codigo_venda: parseInt(termoBusca, 10),
      };

      const vendas = await Venda.find(query)
        .populate({
          path: "cliente",
          select: "nome codigo_cliente",
        })
        .sort({ codigo_venda: -1, data_emissao: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean();

      const total = await Venda.countDocuments(query);

      return res.status(200).json({
        data: vendas,
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        pageSize: limitNumber,
      });
    }

    if (searchType === "cliente" || searchType === "todos") {
      const aggregatePipeline = [];

      aggregatePipeline.push({
        $match: baseMatch,
      });

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

      const orConditions = [];

      if (searchType === "cliente" || searchType === "todos") {
        orConditions.push({
          "cliente_populated.nome": { $regex: termoBusca, $options: "i" },
        });
        orConditions.push({
          "cliente_sem_cadastro.nome": { $regex: termoBusca, $options: "i" },
        });
      }

      if (searchType === "todos" || searchType === "vendedor") {
        orConditions.push({
          vendedor: { $regex: termoBusca, $options: "i" },
        });
      }

      if (searchType === "todos" || searchType === "tipo") {
        orConditions.push({
          tipo: { $regex: termoBusca, $options: "i" },
        });
      }

      if (orConditions.length > 0) {
        aggregatePipeline.push({
          $match: {
            $or: orConditions,
          },
        });
      }

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
              else: "$cliente",
            },
          },
        },
      });

      aggregatePipeline.push({
        $project: {
          cliente_populated: 0,
        },
      });

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
          $match: {
            $or: orConditions,
          },
        },
        { $count: "total" },
      ];

      const totalResult = await Venda.aggregate(totalPipeline);
      const total = totalResult.length > 0 ? totalResult[0].total : 0;

      aggregatePipeline.push(
        { $sort: { codigo_venda: -1, data_emissao: -1 } },
        { $skip: (pageNumber - 1) * limitNumber },
        { $limit: limitNumber }
      );

      const vendas = await Venda.aggregate(aggregatePipeline);

      return res.status(200).json({
        data: vendas,
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        pageSize: limitNumber,
      });
    }

    const query = {
      ...baseMatch,
      [searchType]: { $regex: termoBusca, $options: "i" },
    };

    const vendas = await Venda.find(query)
      .populate({
        path: "cliente",
        select: "nome codigo_cliente",
      })
      .sort({ codigo_venda: -1, data_emissao: -1 })
      .skip((pageNumber - 1) * limitNumber)
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
