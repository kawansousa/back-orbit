const mongoose = require("mongoose");
const Pagar = require("../models/pagar.model");
const ContasBancarias = require("../models/contas_bancarias.model")
const Caixa = require("../models/caixa.model")
const MovimentacaoCaixa = require("../models/movimentacoes_caixa.model")

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

exports.liquidarPagar = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_pagar,
      valor,
      meio_pagamento,
      observacao,
      codigo_movimento,
      dados_transferencia,
    } = req.body;

    if (!codigo_loja || !codigo_empresa || !codigo_pagar || !meio_pagamento) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Campos obrigatórios faltando." });
    }

    const valorNumerico = parseFloat(valor);
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Valor inválido ou menor/igual a zero." });
    }

    if (meio_pagamento === "transferencia" && (!dados_transferencia || !dados_transferencia.codigo_conta_bancaria_origem)) {
      await session.abortTransaction();
      return res.status(400).json({ error: "Para transferência, 'dados_transferencia' com 'codigo_conta_bancaria_origem' é obrigatório." });
    }

    const contaAPagar = await Pagar.findOne({
      codigo_loja,
      codigo_empresa,
      codigo_pagar,
    }).session(session);

    if (!contaAPagar) {
      await session.abortTransaction();
      return res.status(404).json({ error: "Conta a pagar não encontrada" });
    }
    if (["liquidado", "cancelado"].includes(contaAPagar.status)) {
      await session.abortTransaction();
      return res.status(400).json({ error: `Conta a pagar já está com status: ${contaAPagar.status}` });
    }
    if (valorNumerico > contaAPagar.valor_restante) {
      await session.abortTransaction();
      return res.status(400).json({ error: `Valor (${valorNumerico}) não pode ser maior que o valor restante (${contaAPagar.valor_restante})` });
    }

    const novoValorRestante = contaAPagar.valor_restante - valorNumerico;
    const novoStatus = novoValorRestante === 0 ? "liquidado" : "parcial";

    const contaPagaAtualizada = await Pagar.findOneAndUpdate(
      { codigo_loja, codigo_empresa, codigo_pagar },
      {
        $set: { valor_restante: novoValorRestante, status: novoStatus },
        $push: { liquidacoes: { valor: valorNumerico, meio_pagamento, observacao } },
      },
      { new: true, session }
    );

    const movimentacao = {
      codigo_loja,
      codigo_empresa,
      codigo_movimento,
      tipo_movimentacao: "saida",
      valor: valorNumerico,
      meio_pagamento,
      documento_origem: codigo_pagar,
      origem: "pagar",
      categoria_contabil: "2.1.1",
    };

    if (meio_pagamento === "dinheiro") {
      const caixa = await Caixa.findOne({ codigo_loja, codigo_empresa, status: "aberto" }).session(session);
      if (!caixa) {
        await session.abortTransaction();
        return res.status(400).json({ error: "Nenhum caixa aberto encontrado para efetuar o pagamento." });
      }
      if (caixa.saldo_final < valorNumerico) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Saldo insuficiente no caixa. Saldo atual: ${caixa.saldo_final}` });
      }
      caixa.saldo_final -= valorNumerico;
      await caixa.save({ session });
      movimentacao.caixaId = caixa._id;
      movimentacao.codigo_caixa = caixa.codigo_caixa;
    } else if (meio_pagamento === "pix") {
      const contaBancariaPadrao = await ContasBancarias.findOne({ codigo_loja, codigo_empresa, conta_padrao: true }).session(session);
      if (!contaBancariaPadrao) {
        await session.abortTransaction();
        return res.status(404).json({ error: "Nenhuma conta bancária padrão encontrada para efetuar o PIX." });
      }
      if (contaBancariaPadrao.saldo < valorNumerico) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Saldo insuficiente na conta padrão. Saldo atual: ${contaBancariaPadrao.saldo}` });
      }
      contaBancariaPadrao.saldo -= valorNumerico;
      await contaBancariaPadrao.save({ session });
      movimentacao.codigo_conta_bancaria = contaBancariaPadrao.codigo_conta_bancaria;
    } else if (meio_pagamento === "transferencia") {
      const contaOrigem = await ContasBancarias.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_conta_bancaria: dados_transferencia.codigo_conta_bancaria_origem,
      }).session(session);
      if (!contaOrigem) {
        await session.abortTransaction();
        return res.status(404).json({ error: "A conta bancária de origem da transferência não foi encontrada." });
      }
      if (contaOrigem.saldo < valorNumerico) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Saldo insuficiente na conta de origem. Saldo atual: ${contaOrigem.saldo}` });
      }
      contaOrigem.saldo -= valorNumerico;
      await contaOrigem.save({ session });
      movimentacao.codigo_conta_bancaria = contaOrigem.codigo_conta_bancaria;
    }

    const novaMovimentacao = new MovimentacaoCaixa(movimentacao);
    await novaMovimentacao.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      message: "Conta a pagar liquidada com sucesso",
      conta_paga: contaPagaAtualizada,
      liquidacao: {
        valor_liquidado: valorNumerico,
        valor_restante: novoValorRestante,
        status_anterior: contaAPagar.status,
        status_atual: novoStatus,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: "Ocorreu um erro no servidor.", details: error.message });
  } finally {
    session.endSession();
  }
};
