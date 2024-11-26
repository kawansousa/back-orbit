const Receber = require('../models/receber.model');
const mongoose = require('mongoose');

exports.criarReceber = async (req, res) => {
  try {
    const { 
      cliente, 
      codigo_empresa, 
      codigo_loja,
      codigo_receber,
      valor_total,
      tipo_documento,
      parcelas,
      origem_documento,
      numero_documento
    } = req.body;

    // Validações básicas
    if (!parcelas || parcelas.length === 0) {
      return res.status(400).json({ message: 'É necessário criar pelo menos uma parcela' });
    }

    const novoReceber = new Receber({
      cliente,
      codigo_empresa,
      codigo_loja,
      codigo_receber,
      valor_total,
      tipo_documento,
      parcelas,
      origem_documento,
      numero_documento
    });

    await novoReceber.save();
    res.status(201).json(novoReceber);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/* exports.renegociarParcelas = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      receberId, 
      parcelas_originais, 
      parcelas_novas, 
      motivo 
    } = req.body;

    const receber = await Receber.findById(receberId).session(session);

    if (!receber) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    // Marcar parcelas originais como renegociadas
    parcelas_originais.forEach(parcelaId => {
      const parcelaIndex = receber.parcelas.findIndex(p => p._id.toString() === parcelaId);
      if (parcelaIndex !== -1) {
        receber.parcelas[parcelaIndex].status = 'renegociado';
      }
    });

    // Adicionar novas parcelas
    receber.parcelas.push(...parcelas_novas);

    // Registrar histórico de renegociação
    receber.historico_renegociacoes.push({
      parcelas_originais,
      parcelas_novas,
      motivo,
      usuario_responsavel: req.usuario._id
    });

    // Atualizar status do documento
    receber.status_documento = 'renegociado';
    receber.usuario_ultima_alteracao = req.usuario._id;

    await receber.save({ session });
    await session.commitTransaction();

    res.status(200).json(receber);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
}; */

exports.cancelarReceber = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      receberId, 
      motivo_cancelamento 
    } = req.body;

    const receber = await Receber.findById(receberId).session(session);

    if (!receber) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    // Cancelar todas as parcelas pendentes
    receber.parcelas.forEach(parcela => {
      if (parcela.status === 'pendente') {
        parcela.status = 'cancelado';
      }
    });

    receber.status_documento = 'cancelado';
    receber.motivo_cancelamento = motivo_cancelamento;
    receber.usuario_ultima_alteracao = req.usuario._id;

    await receber.save({ session });
    await session.commitTransaction();

    res.status(200).json(receber);
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
      status_documento, 
      page = 1, 
      limit = 20,
      dataInicio,
      dataFim
    } = req.query;

    const query = {
      codigo_empresa,
      codigo_loja
    };

    if (status_documento) query.status_documento = status_documento;
    
    // Filtro por data de emissão
    if (dataInicio && dataFim) {
      query.data_emissao = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }

    const skip = (page - 1) * limit;

    const recebers = await Receber.find(query)
      .populate('cliente', 'nome')  // Opcional: popular detalhes do cliente
      .sort({ data_emissao: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Receber.countDocuments(query);

    res.status(200).json({
      data: recebers,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.registrarPagamentoParcela = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { 
      receberId, 
      parcelaId, 
      valor_pago, 
      data_pagamento,
      juros = 0,
      multa = 0,
      desconto = 0
    } = req.body;

    const receber = await Receber.findById(receberId).session(session);

    if (!receber) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Documento não encontrado' });
    }

    const parcelaIndex = receber.parcelas.findIndex(p => p._id.toString() === parcelaId);

    if (parcelaIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Parcela não encontrada' });
    }

    const parcela = receber.parcelas[parcelaIndex];

    if (parcela.status !== 'pendente') {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Parcela não pode ser paga' });
    }

    parcela.status = 'pago';
    parcela.data_pagamento = data_pagamento || new Date();
    parcela.valor_pago = valor_pago;
    parcela.juros = juros;
    parcela.multa = multa;
    parcela.desconto = desconto;

    // Verificar se todas as parcelas estão pagas
    const todasPagas = receber.parcelas.every(p => p.status === 'pago');
    if (todasPagas) {
      receber.status_documento = 'liquidado';
    }

    receber.usuario_ultima_alteracao = req.usuario._id;

    await receber.save({ session });
    await session.commitTransaction();

    res.status(200).json(receber);
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};