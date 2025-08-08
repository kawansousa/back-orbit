const mongoose = require('mongoose');
const Pagar = require('../models/pagar.model');

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
      categoria
    } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Código da empresa e loja são obrigatórios' });
    }

    if (!descricao) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Descrição é obrigatória' });
    }

    if (!categoria || !['servicos', 'aluguel', 'contas_consumo', 'outros'].includes(categoria)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Categoria inválida' });
    }

    if (!origem || !['entrada', 'manual'].includes(origem)) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Origem deve ser "entrada" ou "manual"' });
    }

    if (!documento_origem) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Documento de origem é obrigatório' });
    }

    if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Parcelas inválidas' });
    }

    const lastPagar = await Pagar.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_pagar: -1 })
      .session(session); 

    let nextCodigoPagar = lastPagar ? lastPagar.codigo_pagar + 1 : 1;

    const pagamentos = [];

    for (let i = 0; i < parcelas.length; i++) {
      const { valor_total, data_vencimento, observacao: obs_parcela } = parcelas[i];

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
          .json({ error: `Data de vencimento é obrigatória na parcela ${i + 1}` });
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
      fornecedor,
      status,
      data_inicial,
      data_final,
      page = 1,
      limit = 10
    } = req.query;

    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da empresa e loja são obrigatórios' });
    }

    const query = {
      codigo_empresa,
      codigo_loja
    };

    if (fornecedor) query.fornecedor = fornecedor;
    if (status) query.status = status;

    if (data_inicial || data_final) {
      query.data_vencimento = {};
      
      if (data_inicial) {
        query.data_vencimento.$gte = new Date(data_inicial);
      }
      
      if (data_final) {
        const dataFinalCompleta = new Date(data_final);
        dataFinalCompleta.setHours(23, 59, 59, 999);
        query.data_vencimento.$lte = dataFinalCompleta;
      }
    }

    const skip = (page - 1) * limit;
    const limitNum = Number(limit);

    const pagamentos = await Pagar.find(query)
      .populate('fornecedor')
      .skip(skip)
      .limit(limitNum)
      .sort({ data_emissao: -1, codigo_pagar: -1 });

    const total = await Pagar.countDocuments(query);

    res.status(200).json({
      pagamentos,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limitNum),
      hasNextPage: page < Math.ceil(total / limitNum),
      hasPrevPage: page > 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      observacao
    } = req.body;

    // Validações básicas
    if (!codigo_loja || !codigo_empresa) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Código da empresa e loja são obrigatórios' });
    }

    if (!codigo_pagar) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Código do pagamento é obrigatório' });
    }

    if (!valor || valor <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    if (!forma_pagamento) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Forma de pagamento é obrigatória' });
    }

    // Buscar o pagamento
    const pagamento = await Pagar.findOne({
      codigo_loja,
      codigo_empresa,
      codigo_pagar
    }).session(session);

    if (!pagamento) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Pagamento não encontrado' });
    }

    // Verificar se o pagamento pode ser liquidado
    if (pagamento.status === 'liquidado') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Pagamento já foi liquidado' });
    }

    if (pagamento.status === 'cancelado') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Não é possível liquidar um pagamento cancelado' });
    }

    // Verificar se o valor não excede o valor restante
    if (valor > pagamento.valor_restante) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: `Valor (${valor}) não pode ser maior que o valor restante (${pagamento.valor_restante})` 
      });
    }

    // Calcular novo valor restante
    const novoValorRestante = pagamento.valor_restante - valor;

    // Determinar novo status baseado no valor restante
    let novoStatus;
    if (novoValorRestante === 0) {
      novoStatus = 'liquidado';
    } else if (novoValorRestante < pagamento.valor_total) {
      novoStatus = 'parcial';
    } else {
      novoStatus = 'aberto';
    }

    // Criar objeto da liquidação (o campo data terá default Date.now pelo schema)
    const novaLiquidacao = {
      valor,
      forma_pagamento,
      observacao
    };

    // Atualizar o pagamento
    const pagamentoAtualizado = await Pagar.findOneAndUpdate(
      {
        codigo_loja,
        codigo_empresa,
        codigo_pagar
      },
      {
        $set: {
          valor_restante: novoValorRestante,
          status: novoStatus
        },
        $push: {
          liquidacoes: novaLiquidacao
        }
      },
      {
        new: true,
        session
      }
    ).populate('fornecedor');

    await session.commitTransaction();

    res.status(200).json({
      message: 'Pagamento liquidado com sucesso',
      pagamento: pagamentoAtualizado,
      liquidacao: {
        valor_liquidado: valor,
        valor_restante: novoValorRestante,
        status_anterior: pagamento.status,
        status_atual: novoStatus
      }
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};