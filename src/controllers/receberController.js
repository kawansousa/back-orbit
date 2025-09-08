const mongoose = require("mongoose");
const Receber = require("../models/receber.model");
const Caixa = require("../models/caixa.model");
const MovimentacaoCaixa = require("../models/movimentacoes_caixa.model");
const ContasBancarias = require("../models/contas_bancarias.model");

exports.criarReceber = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_loja,
      codigo_empresa,
      cliente,
      origem,
      documento_origem,
      parcelas,
      preco,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Código da loja e empresa são obrigatórios" });
    }

    if (!cliente) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Cliente é obrigatório" });
    }

    if (!origem) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Origem é obrigatória" });
    }

    if (!documento_origem) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ message: "Documento de origem é obrigatório" });
    }

    if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Parcelas inválidas" });
    }

    const recebimentos = [];
    const codigosGerados = [];

    for (let i = 0; i < parcelas.length; i++) {
      const { valor_total, data_vencimento, observacao, codigo_receber } =
        parcelas[i];

      if (!valor_total || valor_total <= 0) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: `Valor total inválido na parcela ${i + 1}` });
      }

      if (!data_vencimento) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Data de vencimento é obrigatória na parcela ${i + 1}`,
        });
      }

      if (!codigo_receber) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Código receber não foi gerado para a parcela ${i + 1}`,
        });
      }

      const receberExistente = await Receber.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_receber,
      }).session(session);

      if (receberExistente) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: `Código receber ${codigo_receber} já existe` });
      }

      const novoReceber = new Receber({
        codigo_loja,
        codigo_empresa,
        cliente,
        origem,
        documento_origem,
        valor_total,
        valor_restante: valor_total,
        data_vencimento: new Date(data_vencimento),
        codigo_receber,
        observacao,
        status: "aberto",
        fatura: `${i + 1}/${parcelas.length}`,
      });

      recebimentos.push(novoReceber.save({ session }));
      codigosGerados.push(codigo_receber);
    }

    await Promise.all(recebimentos);
    await session.commitTransaction();

    res.status(201).json({
      message: "Recebíveis criados com sucesso",
      total_parcelas: parcelas.length,
      codigos_gerados: codigosGerados,
      valor_total: parcelas.reduce((sum, p) => sum + p.valor_total, 0),
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Erro ao criar recebíveis:", error);
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.listarRecebers = async (req, res) => {
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
      searchType = "todos",
    } = req.query;

    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({
        message: "Os campos codigo_empresa e codigo_loja são obrigatórios.",
      });
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
            data_vencimento: {
              ...(dataInicio ? { $gte: new Date(dataInicio) } : {}),
              ...(dataFim ? { $lte: new Date(dataFim) } : {}),
            },
          }
        : {}),
    };

    if (!searchTerm || searchTerm.trim() === "") {
      const recebers = await Receber.find(baseMatch)
        .populate("cliente", "nome")
        .sort({ codigo_receber: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean();

      const total = await Receber.countDocuments(baseMatch);

      return res.status(200).json({
        data: recebers,
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        pageSize: limitNumber,
      });
    }

    const termoBusca = searchTerm.trim();

    const validSearchTypes = [
      "todos",
      "codigo_receber",
      "fatura",
      "cliente",
      "origem",
      "documento_origem",
      "valor_total",
      "valor_restante",
    ];

    if (!validSearchTypes.includes(searchType)) {
      return res.status(400).json({
        error:
          "Tipo de busca inválido. Use: todos, codigo_receber, fatura, cliente, origem, documento_origem, valor_total, valor_restante",
      });
    }

    const isNumeric = (str) => {
      return !isNaN(str) && !isNaN(parseFloat(str));
    };

    const parseMonetaryValue = (str) => {
      const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
      return parseFloat(cleaned);
    };

    let query;

    if (searchType === "todos") {
      const searchConditions = [];

      const stringFields = ["fatura", "origem", "documento_origem"];
      stringFields.forEach((field) => {
        searchConditions.push({
          [field]: { $regex: termoBusca, $options: "i" },
        });
      });

      if (isNumeric(termoBusca)) {
        const codigoNumerico = parseInt(termoBusca, 10);
        if (!isNaN(codigoNumerico)) {
          searchConditions.push({ codigo_receber: codigoNumerico });
        }
      }

      const valorNumerico = parseMonetaryValue(termoBusca);
      if (!isNaN(valorNumerico) && valorNumerico > 0) {
        searchConditions.push(
          { valor_total: valorNumerico },
          { valor_restante: valorNumerico }
        );
      }

      try {
        const pipeline = [
          { $match: baseMatch },
          {
            $lookup: {
              from: "clientes",
              localField: "cliente",
              foreignField: "_id",
              as: "cliente_info",
            },
          },
          {
            $match: {
              "cliente_info.nome": { $regex: termoBusca, $options: "i" },
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ];

        const clientesFiltrados = await Receber.aggregate(pipeline);
        const idsClientesFiltrados = clientesFiltrados.map((item) => item._id);

        if (idsClientesFiltrados.length > 0) {
          searchConditions.push({ _id: { $in: idsClientesFiltrados } });
        }
      } catch (clienteError) {
        console.error("Erro na busca por cliente:", clienteError);
      }

      if (searchConditions.length === 0) {
        return res.status(200).json({
          data: [],
          total: 0,
          page: pageNumber,
          totalPages: 0,
          pageSize: limitNumber,
        });
      }

      query = {
        ...baseMatch,
        $or: searchConditions,
      };
    } else if (searchType === "codigo_receber") {
      if (!isNumeric(termoBusca)) {
        return res.status(400).json({
          error: "Código do receber deve ser um número válido",
        });
      }

      const codigoNumerico = parseInt(termoBusca, 10);
      query = {
        ...baseMatch,
        codigo_receber: codigoNumerico,
      };
    } else if (searchType === "cliente") {
      try {
        const pipeline = [
          { $match: baseMatch },
          {
            $lookup: {
              from: "clientes",
              localField: "cliente",
              foreignField: "_id",
              as: "cliente_info",
            },
          },
          {
            $match: {
              "cliente_info.nome": { $regex: termoBusca, $options: "i" },
            },
          },
          {
            $project: {
              _id: 1,
            },
          },
        ];

        const clientesFiltrados = await Receber.aggregate(pipeline);
        const idsClientesFiltrados = clientesFiltrados.map((item) => item._id);

        query = {
          ...baseMatch,
          _id: { $in: idsClientesFiltrados },
        };
      } catch (clienteError) {
        console.error("Erro na busca por cliente:", clienteError);
        return res.status(500).json({
          message: "Erro ao buscar por cliente",
          error:
            process.env.NODE_ENV === "development"
              ? clienteError.message
              : undefined,
        });
      }
    } else if (
      searchType === "valor_total" ||
      searchType === "valor_restante"
    ) {
      const valor = parseMonetaryValue(termoBusca);

      if (isNaN(valor)) {
        return res.status(400).json({
          error: "Valor inválido para busca por valor_total ou valor_restante",
        });
      }

      query = {
        ...baseMatch,
        [searchType]: valor,
      };
    } else {
      query = {
        ...baseMatch,
        [searchType]: { $regex: termoBusca, $options: "i" },
      };
    }

    const recebers = await Receber.find(query)
      .populate("cliente", "nome")
      .sort({ codigo_receber: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    const total = await Receber.countDocuments(query);

    res.status(200).json({
      data: recebers,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      pageSize: limitNumber,
    });
  } catch (error) {
    console.error("Erro ao listar recebíveis:", error);
    console.error("Query que causou erro:", JSON.stringify(req.query, null, 2));

    if (error.name === "CastError") {
      return res.status(400).json({
        message: `Erro de conversão: ${error.message}`,
        error:
          process.env.NODE_ENV === "development"
            ? {
                field: error.path,
                value: error.value,
                expectedType: error.kind,
              }
            : undefined,
      });
    }

    res.status(500).json({
      message: "Erro interno do servidor",
      error:
        process.env.NODE_ENV === "development"
          ? {
              message: error.message,
              stack: error.stack,
            }
          : undefined,
    });
  }
};

exports.liquidarReceber = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_receber,
      valor,
      meio_pagamento,
      observacao,
      codigo_movimento,
      dados_transferencia,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Código da empresa e loja são obrigatórios" });
    }

    if (!codigo_receber) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Código do recebimento é obrigatório" });
    }

    if (!valor || valor <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Valor deve ser maior que zero" });
    }

    if (!meio_pagamento) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Meio de pagamento é obrigatório" });
    }

    const meiosPagamentoValidos = [
      "dinheiro",
      "pix",
      "cartao_credito",
      "cartao_debito",
      "transferencia",
      "cheque",
      "aprazo",
    ];

    if (!meiosPagamentoValidos.includes(meio_pagamento)) {
      await session.abortTransaction();
      return res.status(400).json({
        error: `Meio de pagamento inválido. Valores aceitos: ${meiosPagamentoValidos.join(
          ", "
        )}`,
      });
    }

    const recebimento = await Receber.findOne({
      codigo_loja,
      codigo_empresa,
      codigo_receber,
    }).session(session);

    if (!recebimento) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Recebimento não encontrado" });
    }

    if (recebimento.status === "liquidado") {
      await session.abortTransaction();
      return res.status(400).json({ error: "Recebimento já foi liquidado" });
    }

    if (recebimento.status === "cancelado") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Não é possível liquidar um recebimento cancelado" });
    }

    if (valor > recebimento.valor_restante) {
      await session.abortTransaction();
      return res.status(400).json({
        error: `Valor (${valor}) não pode ser maior que o valor restante (${recebimento.valor_restante})`,
      });
    }

    const novoValorRestante = recebimento.valor_restante - valor;

    let novoStatus;
    if (novoValorRestante === 0) {
      novoStatus = "liquidado";
    } else if (novoValorRestante < recebimento.valor_total) {
      novoStatus = "parcial";
    } else {
      novoStatus = "aberto";
    }

    const novaLiquidacao = {
      valor,
      meio_pagamento,
      observacao,
    };

    const recebimentoAtualizado = await Receber.findOneAndUpdate(
      {
        codigo_loja,
        codigo_empresa,
        codigo_receber,
      },
      {
        $set: {
          valor_restante: novoValorRestante,
          status: novoStatus,
        },
        $push: {
          liquidacoes: novaLiquidacao,
        },
      },
      {
        new: true,
        session,
      }
    ).populate("cliente");

    const caixa = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: "aberto",
    }).session(session);

    if (!caixa) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Nenhum caixa aberto encontrado para esta loja." });
    }

    const contaBancariaPadrao = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      conta_padrao: true,
    }).session(session);

    const ContaBancaria = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      codigo_conta_bancaria: dados_transferencia.codigo_conta_bancaria,
    });

    const movimentacao = {
      codigo_loja,
      codigo_empresa,
      caixaId: caixa._id,
      codigo_movimento,
      caixa: caixa.caixa,
      codigo_caixa: caixa.codigo_caixa,
      tipo_movimentacao: "entrada",
      valor,
      meio_pagamento,
      documento_origem: codigo_receber,
      origem: "receber",
      categoria_contabil: "1.1.1",
    };

    if (meio_pagamento.toLowerCase() === "dinheiro") {
      caixa.saldo_final += valor;
      await caixa.save({ session });
    }
    if (meio_pagamento.toLowerCase() === "pix") {
      movimentacao.codigo_conta_bancaria =
        contaBancariaPadrao.codigo_conta_bancaria;
      const teste01 = (contaBancariaPadrao.saldo += valor);
      await contaBancariaPadrao.save({ session });
    }
    if (meio_pagamento.toLowerCase() === "transferencia") {
      movimentacao.codigo_conta_bancaria =
        dados_transferencia.codigo_conta_bancaria;

      const teste = (ContaBancaria.saldo += parseFloat(valor));
      await ContaBancaria.save({ session });
    }

    const novaMovimentacao = new MovimentacaoCaixa(movimentacao);
    await novaMovimentacao.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Recebimento liquidado com sucesso",
      recebimento: recebimentoAtualizado,
      liquidacao: {
        valor_liquidado: valor,
        valor_restante: novoValorRestante,
        status_anterior: recebimento.status,
        status_atual: novoStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
