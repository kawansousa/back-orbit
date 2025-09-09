const mongoose = require("mongoose");
const Pagar = require("../models/pagar.model");

exports.criarPagar = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_empresa,
      codigo_loja,
      fornecedor,
      origem,
      documento_origem,
      parcelas,
      observacao,
      descricao,
      categoria,
    } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Código da empresa e loja são obrigatórios" });
    }

    if (!descricao) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Descrição é obrigatória" });
    }

    if (
      !categoria ||
      !["servicos", "aluguel", "contas_consumo", "outros"].includes(categoria)
    ) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Categoria inválida" });
    }

    if (!origem || !["entrada", "manual"].includes(origem)) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: 'Origem deve ser "entrada" ou "manual"' });
    }

    if (!documento_origem) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Documento de origem é obrigatório" });
    }

    if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Parcelas inválidas" });
    }

    const lastPagar = await Pagar.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_pagar: -1 })
      .session(session);

    let nextCodigoPagar = lastPagar ? lastPagar.codigo_pagar + 1 : 1;

    const pagamentos = [];

    for (let i = 0; i < parcelas.length; i++) {
      const {
        valor_total,
        data_vencimento,
        observacao: obs_parcela,
      } = parcelas[i];

      if (!valor_total || valor_total <= 0) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ error: `Valor total inválido na parcela ${i + 1}` });
      }

      if (!data_vencimento) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({
            error: `Data de vencimento é obrigatória na parcela ${i + 1}`,
          });
      }

      const novoPagar = new Pagar({
        codigo_loja,
        codigo_empresa,
        codigo_pagar: nextCodigoPagar + i,
        fornecedor,
        origem,
        categoria,
        documento_origem,
        valor_total,
        descricao,
        valor_restante: valor_total,
        data_vencimento: new Date(data_vencimento),
        observacao: obs_parcela || observacao,
        status: "aberto",
        fatura: `${i + 1}/${parcelas.length}`,
      });

      pagamentos.push(novoPagar.save({ session }));
    }

    await Promise.all(pagamentos);
    await session.commitTransaction();

    res.status(201).json({ message: "Contas a pagar criadas com sucesso" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.listarPagamentos = async (req, res) => {
  try {
    const {
      codigo_empresa,
      codigo_loja,
      status,
      page = 1,
      limit = 10,
      data_inicial,
      data_final,
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
      ...(data_inicial || data_final
        ? {
            data_vencimento: {
              ...(data_inicial ? { $gte: new Date(data_inicial) } : {}),
              ...(data_final ? { $lte: new Date(data_final) } : {}),
            },
          }
        : {}),
    };

    const fornecedorFields = "razao_social nome_fantasia cnpj fone email";

    if (!searchTerm || searchTerm.trim() === "") {
      const pagamentos = await Pagar.find(baseMatch)
        .populate("fornecedor", fornecedorFields)
        .sort({ codigo_pagar: -1 })
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber)
        .lean();

      const total = await Pagar.countDocuments(baseMatch);

      return res.status(200).json({
        data: pagamentos,
        total,
        page: pageNumber,
        totalPages: Math.ceil(total / limitNumber),
        pageSize: limitNumber,
      });
    }

    const termoBusca = searchTerm.trim();
    const validSearchTypes = [
      "todos",
      "codigo_pagar",
      "fornecedor",
      "fatura",
      "descricao",
      "origem",
      "documento_origem",
      "valor_total",
      "valor_restante",
    ];

    if (!validSearchTypes.includes(searchType)) {
      return res.status(400).json({
        error:
          "Tipo de busca inválido. Use: todos, codigo_pagar, fornecedor, fatura, descricao, origem, documento_origem, valor_total, valor_restante",
      });
    }

    const isNumeric = (str) => !isNaN(str) && !isNaN(parseFloat(str));

    const parseMonetaryValue = (str) => {
      const cleaned = str.replace(/[^\d,.-]/g, "").replace(",", ".");
      return parseFloat(cleaned);
    };

    const buscarPorFornecedor = async (termoBusca, baseMatch) => {
      const pipeline = [
        { $match: baseMatch },
        {
          $lookup: {
            from: "fornecedors",
            localField: "fornecedor",
            foreignField: "_id",
            as: "fornecedor_info",
          },
        },
        {
          $match: {
            $or: [
              { "fornecedor_info.razao_social": { $regex: termoBusca, $options: "i" } },
              { "fornecedor_info.nome_fantasia": { $regex: termoBusca, $options: "i" } },
              { descricao: { $regex: termoBusca, $options: "i" } },
            ],
          },
        },
        { $project: { _id: 1 } },
      ];

      const fornecedoresFiltrados = await Pagar.aggregate(pipeline);
      return fornecedoresFiltrados.map((item) => item._id);
    };

    let query;

    if (searchType === "todos") {
      const searchConditions = [];
      const stringFields = ["fatura", "origem", "documento_origem", "descricao"];

      stringFields.forEach((field) => {
        searchConditions.push({
          [field]: { $regex: termoBusca, $options: "i" },
        });
      });

      if (isNumeric(termoBusca)) {
        const codigoNumerico = parseInt(termoBusca, 10);
        if (!isNaN(codigoNumerico)) {
          searchConditions.push({ codigo_pagar: codigoNumerico });
        }
      }

      const valorNumerico = parseMonetaryValue(termoBusca);
      if (!isNaN(valorNumerico) && valorNumerico > 0) {
        searchConditions.push(
          { valor_total: valorNumerico },
          { valor_restante: valorNumerico }
        );
      }

      const idsFornecedoresFiltrados = await buscarPorFornecedor(termoBusca, baseMatch);
      if (idsFornecedoresFiltrados.length > 0) {
        searchConditions.push({ _id: { $in: idsFornecedoresFiltrados } });
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

      query = { ...baseMatch, $or: searchConditions };
    } else if (searchType === "codigo_pagar") {
      if (!isNumeric(termoBusca)) {
        return res.status(400).json({
          error: "Código do pagar deve ser um número válido",
        });
      }

      const codigoNumerico = parseInt(termoBusca, 10);
      query = { ...baseMatch, codigo_pagar: codigoNumerico };
    } else if (searchType === "fornecedor") {
      const idsFornecedoresFiltrados = await buscarPorFornecedor(termoBusca, baseMatch);

      if (idsFornecedoresFiltrados.length === 0) {
        return res.status(200).json({
          data: [],
          total: 0,
          page: pageNumber,
          totalPages: 0,
          pageSize: limitNumber,
        });
      }

      query = { ...baseMatch, _id: { $in: idsFornecedoresFiltrados } };
    } else if (searchType === "valor_total" || searchType === "valor_restante") {
      const valor = parseMonetaryValue(termoBusca);
      if (isNaN(valor)) {
        return res.status(400).json({
          error: "Valor inválido para busca por valor_total ou valor_restante",
        });
      }

      query = { ...baseMatch, [searchType]: valor };
    } else {
      query = { ...baseMatch, [searchType]: { $regex: termoBusca, $options: "i" } };
    }

    const pagamentos = await Pagar.find(query)
      .populate("fornecedor", fornecedorFields)
      .sort({ codigo_pagar: -1 })
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .lean();

    const total = await Pagar.countDocuments(query);

    res.status(200).json({
      data: pagamentos,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      pageSize: limitNumber,
    });
  } catch (error) {
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

exports.liquidarPagamento = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_pagar,
      valor,
      forma_pagamento,
      observacao,
    } = req.body;

    // Validações básicas
    if (!codigo_loja || !codigo_empresa) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Código da empresa e loja são obrigatórios" });
    }

    if (!codigo_pagar) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Código do pagamento é obrigatório" });
    }

    if (!valor || valor <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Valor deve ser maior que zero" });
    }

    if (!forma_pagamento) {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Forma de pagamento é obrigatória" });
    }

    // Buscar o pagamento
    const pagamento = await Pagar.findOne({
      codigo_loja,
      codigo_empresa,
      codigo_pagar,
    }).session(session);

    if (!pagamento) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Pagamento não encontrado" });
    }

    // Verificar se o pagamento pode ser liquidado
    if (pagamento.status === "liquidado") {
      await session.abortTransaction();
      return res.status(400).json({ error: "Pagamento já foi liquidado" });
    }

    if (pagamento.status === "cancelado") {
      await session.abortTransaction();
      return res
        .status(400)
        .json({ error: "Não é possível liquidar um pagamento cancelado" });
    }

    // Verificar se o valor não excede o valor restante
    if (valor > pagamento.valor_restante) {
      await session.abortTransaction();
      return res.status(400).json({
        error: `Valor (${valor}) não pode ser maior que o valor restante (${pagamento.valor_restante})`,
      });
    }

    // Calcular novo valor restante
    const novoValorRestante = pagamento.valor_restante - valor;

    // Determinar novo status baseado no valor restante
    let novoStatus;
    if (novoValorRestante === 0) {
      novoStatus = "liquidado";
    } else if (novoValorRestante < pagamento.valor_total) {
      novoStatus = "parcial";
    } else {
      novoStatus = "aberto";
    }

    // Criar objeto da liquidação (o campo data terá default Date.now pelo schema)
    const novaLiquidacao = {
      valor,
      forma_pagamento,
      observacao,
    };

    // Atualizar o pagamento
    const pagamentoAtualizado = await Pagar.findOneAndUpdate(
      {
        codigo_loja,
        codigo_empresa,
        codigo_pagar,
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
    ).populate("fornecedor");

    await session.commitTransaction();

    res.status(200).json({
      message: "Pagamento liquidado com sucesso",
      pagamento: pagamentoAtualizado,
      liquidacao: {
        valor_liquidado: valor,
        valor_restante: novoValorRestante,
        status_anterior: pagamento.status,
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
