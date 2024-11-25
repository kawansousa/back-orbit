const Caixa = require('../models/caixa.model');
const Movimentacao = require('../models/movimentacoes.model');

// Abertura de Caixa
exports.abrirCaixa = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_caixa,
      responsavel_abertura,
      saldo_inicial,
      caixa
    } = req.body;

    // Verifica se já existe caixa aberto para essa loja
    const caixaAberto = await Caixa.findOne({
      codigo_loja,
      codigo_caixa,
      status: 'aberto'
    });

    if (caixaAberto) {
      return res.status(400).json({ message: 'Já existe um caixa aberto para esta loja' });
    }

    const novoCaixa = new Caixa({
      codigo_loja,
      codigo_empresa,
      codigo_caixa,
      responsavel_abertura,
      saldo_inicial,
      status: 'aberto',
      caixa
    });

    await novoCaixa.save();
    res.status(201).json(novoCaixa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Registrar Movimentação
exports.registrarMovimentacao = async (req, res) => {
  try {
    const { caixaId } = req.params;
    const {
      tipo_movimentacao,
      codigo_movimento,
      valor,
      origem,
      meio_pagamento,
      documento_origem,
      categoria_contabil
    } = req.body;

    const caixa = await Caixa.findById(caixaId);
    console.log('Caixa encontrado:', caixa);

    if (!caixa || caixa.status !== 'aberto') {
      console.log('Status do caixa:', caixa?.status);
      return res.status(400).json({ message: 'Caixa não está aberto' });
    }

    const novaMovimentacao = new Movimentacao({
      codigo_loja: caixa.codigo_loja,
      codigo_empresa: caixa.codigo_empresa,
      caixaId,
      codigo_movimento,
      caixa: caixa.caixa,
      tipo_movimentacao,
      valor,
      origem,
      documento_origem,
      numero_movimentacao: Date.now(), // Geração simples de número único
      meio_pagamento,
      categoria_contabil
    });

    // Atualiza saldo do caixa
    if (tipo_movimentacao === 'entrada') {
      caixa.saldo_final += valor;
    } else if (tipo_movimentacao === 'saida') {
      caixa.saldo_final -= valor;
    }


    await caixa.save();
    await novaMovimentacao.save();
    res.status(201).json(novaMovimentacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Listar Caixas
exports.listarCaixas = async (req, res) => {
  try {
    const { codigo_loja } = req.params;
    const { page = 1, limit = 20, searchTerm = '' } = req.query;

    const skip = (page - 1) * limit;

    // Build search query
    const searchQuery = searchTerm 
      ? {
          codigo_loja,
          $or: [
            { responsavel_abertura: { $regex: searchTerm, $options: 'i' } },
            { codigo_caixa: { $regex: searchTerm, $options: 'i' } }
          ]
        }
      : { codigo_loja };

    // Find caixas with pagination
    const caixas = await Caixa.find(searchQuery)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    // Count total documents
    const total = await Caixa.countDocuments(searchQuery);

    res.status(200).json({
      data: caixas,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Detalhes do Caixa com Movimentações
exports.detalhesCaixa = async (req, res) => {
  try {
    const { caixaId } = req.params;

    console.log(caixaId);


    const caixa = await Caixa.findById(caixaId).populate('caixaId');

    if (!caixa) {
      return res.status(404).json({ message: 'Caixa não encontrado' });
    }

    const movimentacoes = await Movimentacao.find({ caixaId: caixa._id });

    res.status(200).json({ caixa, movimentacoes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fecharCaixa = async (req, res) => {
  try {
    const { caixaId } = req.params;
    const { responsavel_fechamento } = req.body;

    const caixa = await Caixa.findById(caixaId);
    if (!caixa) {
      return res.status(404).json({ message: 'Caixa não encontrado' });
    }

    if (caixa.status === 'fechado') {
      return res.status(400).json({ message: 'Caixa já está fechado' });
    }

    caixa.status = 'fechado';
    caixa.data_fechamento = new Date();
    caixa.responsavel_fechamento = responsavel_fechamento;

    await caixa.save();

    res.status(200).json(caixa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
