const mongoose = require("mongoose");
const Receber = require("../models/receber.model");
const Caixa = require("../models/caixa.model");
const Movimentacao = require("../models/movimentacoes_banco.model");

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
      preco
    } = req.body;

    // Validações
    if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Parcelas inválidas" });
    }

    const recebimentos = [];

    for (let i = 0; i < parcelas.length; i++) {
      const { valor_total, data_vencimento, observacao, codigo_receber } =
        parcelas[i];

      if (!valor_total || valor_total <= 0) {
        await session.abortTransaction();
        return res
          .status(400)
          .json({ message: `Valor total inválido na parcela ${i + 1}` });
      }

      const novoReceber = new Receber({
        codigo_loja,
        codigo_empresa,
        cliente,
        origem,
        documento_origem,
        valor_total,
        valor_restante: valor_total,
        data_vencimento,
        codigo_receber,
        observacao,
        status: "aberto",
        fatura: `${i + 1}/${parcelas.length}`,
      });

      recebimentos.push(novoReceber.save({ session }));
    }

    await Promise.all(recebimentos);
    await session.commitTransaction();

    res.status(201).json({ message: "Recebíveis criados com sucesso" });
  } catch (error) {
    await session.abortTransaction();
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
    } = req.query;

    const query = {
      codigo_empresa,
      codigo_loja,
    };

    // Filtro por status
    if (status) query.status = status;

    // Filtro por data de emissão
    if (dataInicio && dataFim) {
      query.data_emissao = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim),
      };
    }

    const skip = (page - 1) * limit;

    const recebers = await Receber.find(query)
      .populate("cliente", "nome")
      .sort({ data_emissao: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Receber.countDocuments(query);

    res.status(200).json({
      data: recebers,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
      observacao
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Código da empresa e loja são obrigatórios' });
    }

    if (!codigo_receber) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Código do recebimento é obrigatório' });
    }

    if (!valor || valor <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Valor deve ser maior que zero' });
    }

    if (!meio_pagamento) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Meio de pagamento é obrigatório' });
    }

    const meiosPagamentoValidos = [
      "dinheiro",
      "pix",
      "cartao_credito", 
      "cartao_debito",
      "cheque",
      "aprazo"
    ];

    if (!meiosPagamentoValidos.includes(meio_pagamento)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: `Meio de pagamento inválido. Valores aceitos: ${meiosPagamentoValidos.join(', ')}` 
      });
    }

    const recebimento = await Receber.findOne({
      codigo_loja,
      codigo_empresa,
      codigo_receber
    }).session(session);

    if (!recebimento) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'Recebimento não encontrado' });
    }

    if (recebimento.status === 'liquidado') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Recebimento já foi liquidado' });
    }

    if (recebimento.status === 'cancelado') {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Não é possível liquidar um recebimento cancelado' });
    }

    if (valor > recebimento.valor_restante) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: `Valor (${valor}) não pode ser maior que o valor restante (${recebimento.valor_restante})` 
      });
    }

    const novoValorRestante = recebimento.valor_restante - valor;

    let novoStatus;
    if (novoValorRestante === 0) {
      novoStatus = 'liquidado';
    } else if (novoValorRestante < recebimento.valor_total) {
      novoStatus = 'parcial';
    } else {
      novoStatus = 'aberto';
    }

    const novaLiquidacao = {
      valor,
      meio_pagamento,
      observacao
    };

    const recebimentoAtualizado = await Receber.findOneAndUpdate(
      {
        codigo_loja,
        codigo_empresa,
        codigo_receber
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
    ).populate('cliente');

    await session.commitTransaction();

    res.status(200).json({
      message: 'Recebimento liquidado com sucesso',
      recebimento: recebimentoAtualizado,
      liquidacao: {
        valor_liquidado: valor,
        valor_restante: novoValorRestante,
        status_anterior: recebimento.status,
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
