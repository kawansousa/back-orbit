const Caixa = require('../models/caixa.model');
const Movimentacao = require('../models/movimentacoes_caixa.model');

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

    const caixaAberto = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      caixa,
      status: 'aberto'
    });

    if (caixaAberto) {
      return res.status(400).json({ message: 'Já existe um caixa aberto para esta loja' });
    }

    const ultimoCaixa = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      caixa,
      status: 'fechado'
    }).sort({ codigo_caixa: -1});


    const saldoInicialReal = ultimoCaixa ? ultimoCaixa.saldo_final : saldo_inicial;

    const novoCaixa = new Caixa({
      codigo_loja,
      codigo_empresa,
      codigo_caixa,
      responsavel_abertura,
      saldo_inicial: saldoInicialReal || '0',
      saldo_final: saldoInicialReal || '0', 
      status: 'aberto',
      caixa
    });

    await novoCaixa.save();
    res.status(201).json(novoCaixa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.registrarMovimentacao = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      tipo_movimentacao,
      codigo_movimento,
      valor,
      origem,
      meio_pagamento,
      documento_origem,
      categoria_contabil,
      obsevacao,
    } = req.body;

    const caixa = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: 'aberto'
    });

    if (!caixa || caixa.status !== 'aberto') {
      return res.status(400).json({ message: 'Caixa não está aberto' });
    }

    const novaMovimentacao = new Movimentacao({
      codigo_loja: caixa.codigo_loja,
      codigo_empresa: caixa.codigo_empresa,
      caixaId: caixa._id,
      codigo_movimento,
      codigo_caixa: caixa.codigo_caixa,
      caixa: caixa.caixa,
      tipo_movimentacao,
      valor,
      origem,
      documento_origem,
      numero_movimentacao: Date.now(), 
      meio_pagamento,
      categoria_contabil,
      obsevacao,
    });

    if (meio_pagamento.toLowerCase() === 'dinheiro') {
      if (tipo_movimentacao === 'entrada') {
        caixa.saldo_final += valor;
      } else if (tipo_movimentacao === 'saida') {
        caixa.saldo_final -= valor;
      }
      await caixa.save();
    }

    await novaMovimentacao.save();
    res.status(201).json(novaMovimentacao);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.detalhesCaixa = async (req, res) => {
  try {
    const { caixaId } = req.params;

    const caixa = await Caixa.findById(caixaId);

    if (!caixa) {
      return res.status(404).json({ message: 'Caixa não encontrado' });
    }

    const movimentacoes = await Movimentacao.find({ caixaId: caixa._id });

    const totalReceitas = movimentacoes
      .filter(mov => mov.tipo_movimentacao === 'entrada')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const totalDespesas = movimentacoes
      .filter(mov => mov.tipo_movimentacao === 'saida')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const pagamentoStats = movimentacoes.reduce((acc, mov) => {
      const method = mov.meio_pagamento.toLowerCase();
      if (!acc[method]) {
        acc[method] = { entradas: 0, saidas: 0, total: 0 };
      }
      
      if (mov.tipo_movimentacao === 'entrada') {
        acc[method].entradas += mov.valor;
      } else {
        acc[method].saidas += mov.valor;
      }
      acc[method].total = acc[method].entradas - acc[method].saidas;
      
      return acc;
    }, {});

    const movimentacoesDinheiro = movimentacoes.filter(
      mov => mov.meio_pagamento.toLowerCase() === 'dinheiro'
    );
    
    const totalDinheiroEntradas = movimentacoesDinheiro
      .filter(mov => mov.tipo_movimentacao === 'entrada')
      .reduce((sum, mov) => sum + mov.valor, 0);
      
    const totalDinheiroSaidas = movimentacoesDinheiro
      .filter(mov => mov.tipo_movimentacao === 'saida')
      .reduce((sum, mov) => sum + mov.valor, 0);

    const total_movimento = totalReceitas - totalDespesas;

    const saldo_dinheiro_calculado = caixa.saldo_inicial + totalDinheiroEntradas - totalDinheiroSaidas;

    res.status(200).json({
      caixa,
      movimentacoes,
      resumo: {
        saldo_inicial: caixa.saldo_inicial,
        saldo_final_caixa: caixa.saldo_final, 
        saldo_dinheiro_calculado, 
        diferenca_saldo: caixa.saldo_final - saldo_dinheiro_calculado, 
        totalReceitas,
        totalDespesas,
        total_movimento, 
        dinheiro: {
          entradas: totalDinheiroEntradas,
          saidas: totalDinheiroSaidas,
          saldo: totalDinheiroEntradas - totalDinheiroSaidas
        },
        pagamentoStats 
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.fecharCaixa = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.body;

    const caixa = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: 'aberto'
    });

    if (!caixa) {
      return res.status(404).json({ message: 'Caixa não encontrado' });
    }

    if (caixa.status === 'fechado') {
      return res.status(400).json({ message: 'Caixa já está fechado' });
    }

    caixa.status = 'fechado';
    caixa.data_fechamento = new Date();

    await caixa.save();

    res.status(200).json(caixa);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listarCaixas = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    const searchQuery = {
      codigo_loja,
      codigo_empresa,
    };

    const caixas = await Caixa.find(searchQuery)
      .sort({ codigo_caixa: -1 });

    const ultimosCaixasAbertos = {};
    caixas.forEach(caixa => {
      if (!ultimosCaixasAbertos[caixa.caixa]) {
        ultimosCaixasAbertos[caixa.caixa] = caixa;
      }
    });

    const result = Object.values(ultimosCaixasAbertos);

    res.status(200).json({
      data: result,
      total: result.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listarTodosCaixas = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page = 1, limit = 20, searchTerm = '' } = req.query;

    const searchQuery = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm && searchTerm.trim() !== '') {
      searchQuery.$or = [
        { responsavel_abertura: { $regex: searchTerm, $options: 'i' } },
        { responsavel_fechamento: { $regex: searchTerm, $options: 'i' } },
        { codigo_caixa: { $regex: searchTerm, $options: 'i' } },
        { caixa: parseInt(searchTerm) || 0 }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const caixas = await Caixa.find(searchQuery)
      .sort({ data_abertura: -1, codigo_caixa: -1 }) 
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Caixa.countDocuments(searchQuery);

    res.status(200).json({
      data: caixas,
      total: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      hasNextPage: skip + caixas.length < total,
      hasPrevPage: parseInt(page) > 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
