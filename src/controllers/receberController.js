const mongoose = require('mongoose');
const Receber = require('../models/receber.model');
const Caixa = require('../models/caixa.model');
const Movimentacao = require('../models/movimentacoes.model');


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
      parcelas
    } = req.body;

    // Validações
    if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Parcelas inválidas' });
    }

    const recebimentos = [];

    for (let i = 0; i < parcelas.length; i++) {
      const { valor_total, data_vencimento, observacao, codigo_receber } = parcelas[i];

      if (!valor_total || valor_total <= 0) {
        await session.abortTransaction();
        return res.status(400).json({ message: `Valor total inválido na parcela ${i + 1}` });
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
        status: 'aberto',
        fatura: `${i + 1}/${parcelas.length}`
      });

      recebimentos.push(novoReceber.save({ session }));
    }

    await Promise.all(recebimentos);
    await session.commitTransaction();

    res.status(201).json({ message: 'Recebíveis criados com sucesso' });
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
      dataFim
    } = req.query;

    const query = {
      codigo_empresa,
      codigo_loja
    };

    // Filtro por status
    if (status) query.status = status;

    // Filtro por data de emissão
    if (dataInicio && dataFim) {
      query.data_emissao = {
        $gte: new Date(dataInicio),
        $lte: new Date(dataFim)
      };
    }

    const skip = (page - 1) * limit;

    const recebers = await Receber.find(query)
      .populate('cliente', 'nome')
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

exports.estornarLiquidacao = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      receberId,
      liquidacaoId,
      valorEstorno,
      codigo_movimento
    } = req.body;

    // Buscar o recebimento
    const receber = await Receber.findById(receberId).session(session);

    if (!receber) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Recebimento não encontrado' });
    }

    // Encontrar a liquidação específica
    const liquidacaoIndex = receber.liquidacoes.findIndex(
      l => l._id.toString() === liquidacaoId && !l.estornado
    );

    if (liquidacaoIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Liquidação não encontrada ou já estornada' });
    }

    const liquidacao = receber.liquidacoes[liquidacaoIndex];

    // Validar valor de estorno
    if (valorEstorno > liquidacao.valor) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Valor de estorno maior que o valor da liquidação',
        valor_liquidacao: liquidacao.valor,
        valor_estorno: valorEstorno
      });
    }

    // Buscar a movimentação original
    const movimentacaoOriginal = await Movimentacao.findById(liquidacao.movimentacao).session(session);

    if (!movimentacaoOriginal) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Movimentação original não encontrada' });
    }

    // Buscar caixa aberto
    const caixa = await Caixa.findOne({
      codigo_loja: receber.codigo_loja,
      codigo_empresa: receber.codigo_empresa,
      status: 'aberto'
    }).session(session);

    if (!caixa) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Caixa não está aberto' });
    }

    // Criar movimentação de estorno
    const movimentacaoEstorno = new Movimentacao({
      ...movimentacaoOriginal.toObject(),
      codigo_movimento,
      _id: undefined,
      tipo_movimentacao: 'saida',
      valor: valorEstorno,
      origem: 'estorno_recebimento',
      observacao: `Estorno parcial de recebimento - ${movimentacaoOriginal.observacao}`
    });

    console.log(movimentacaoEstorno);

    // Marcar liquidação como parcialmente estornada
    receber.liquidacoes[liquidacaoIndex].estornado = valorEstorno === liquidacao.valor;

    // Atualizar valores e status
    receber.valor_restante += valorEstorno;

    if (receber.valor_restante > 0) {
      receber.status = receber.liquidacoes.some(l => !l.estornado) ? 'parcial' : 'aberto';
    }

    // Atualizar saldo do caixa (se for dinheiro)
    if (movimentacaoOriginal.meio_pagamento.toLowerCase() === 'dinheiro') {
      caixa.saldo_final -= valorEstorno;
      await caixa.save({ session });
    }

    // Salvar movimentações
    await movimentacaoEstorno.save({ session });
    await receber.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      receber,
      movimentacao: movimentacaoEstorno
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.liquidarReceber = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { codigo_loja, codigo_empresa, meio_pagamento, valor_liquidacao, parcelas } = req.body;

    let valorRestante = valor_liquidacao;

    // Buscar as parcelas de recebíveis no banco de dados
    const recebimentos = await Receber.find({
      _id: { $in: parcelas.map(p => p.receberId) },
      codigo_loja,
      codigo_empresa
    }).session(session);

    if (recebimentos.length === 0) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Nenhuma parcela encontrada' });
    }

    // Verificar se todas as parcelas pertencem ao mesmo cliente
    const cliente = recebimentos[0].cliente;
    for (const receber of recebimentos) {
      if (receber.cliente.toString() !== cliente.toString()) {
        await session.abortTransaction();
        return res.status(400).json({ message: 'Todas as parcelas devem pertencer ao mesmo cliente' });
      }
    }

    // Ordenar as parcelas por data de vencimento
    recebimentos.sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));

    const movimentacoes = [];
    const liquidacoes = [];

    const caixa = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: 'aberto'
    }).session(session);

    if (!caixa) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Caixa não está aberto' });
    }

    for (const [index, receber] of recebimentos.entries()) {
      if (valorRestante <= 0) break;

      if (receber.status === 'liquidado' || receber.status === 'cancelado') {
        continue; // Pular recebimentos que já estão liquidados ou cancelados
      }

      let valorParaLiquidar = Math.min(valorRestante, receber.valor_restante);

      // Criar movimentação
      const novaMovimentacao = new Movimentacao({
        codigo_loja: receber.codigo_loja,
        codigo_empresa: receber.codigo_empresa,
        caixaId: caixa._id,
        codigo_movimento: parcelas[index].codigo_movimento,
        codigo_caixa: caixa.codigo_caixa,
        caixa: caixa.caixa,
        tipo_movimentacao: 'entrada',
        valor: valorParaLiquidar,
        origem: 'recebimento',
        documento_origem: receber._id,
        meio_pagamento,
        categoria_contabil: 'receita',
        observacao: parcelas.find(p => p.receberId === receber._id.toString()).observacao || `Liquidação de recebimento ${receber.codigo_receber}`
      });

      // Registrar liquidação
      const liquidacao = {
        valor: valorParaLiquidar,
        meio_pagamento,
        movimentacao: novaMovimentacao._id,
        observacao: parcelas.find(p => p.receberId === receber._id.toString()).observacao
      };
      receber.liquidacoes.push(liquidacao);

      // Atualizar valores e status
      receber.valor_restante -= valorParaLiquidar;
      valorRestante -= valorParaLiquidar;

      if (receber.valor_restante === 0) {
        receber.status = 'liquidado';
      } else {
        receber.status = 'parcial';
      }

      // Atualizar saldo do caixa (se for dinheiro)
      if (meio_pagamento.toLowerCase() === 'dinheiro') {
        caixa.saldo_final += valorParaLiquidar;
      }

      movimentacoes.push(novaMovimentacao.save({ session }));
      liquidacoes.push(receber.save({ session }));
    }

    await Promise.all(movimentacoes);
    await Promise.all(liquidacoes);
    await caixa.save({ session });
    await session.commitTransaction();

    res.status(200).json({ message: 'Liquidação realizada com sucesso' });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};


/* exports.liquidarReceber = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      receberId,
      valor_liquidacao,
      meio_pagamento,
      observacao,
      codigo_movimento
    } = req.body;

    // Buscar o recebimento
    const receber = await Receber.findById(receberId).session(session);

    if (!receber) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Recebimento não encontrado' });
    }

    // Validações de status
    if (receber.status === 'liquidado' || receber.status === 'cancelado') {
      await session.abortTransaction();
      return res.status(400).json({
        message: `Não é possível liquidar um recebimento com status ${receber.status}`
      });
    }

    // Verificar se o valor de liquidação é válido
    if (valor_liquidacao > receber.valor_restante) {
      await session.abortTransaction();
      return res.status(400).json({
        message: 'Valor de liquidação maior que o valor restante',
        valor_restante: receber.valor_restante,
        valor_liquidacao
      });
    }

    // Buscar caixa aberto
    const caixa = await Caixa.findOne({
      codigo_loja: receber.codigo_loja,
      codigo_empresa: receber.codigo_empresa,
      status: 'aberto'
    }).session(session);

    if (!caixa) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Caixa não está aberto' });
    }

    // Criar movimentação
    const novaMovimentacao = new Movimentacao({
      codigo_loja: receber.codigo_loja,
      codigo_empresa: receber.codigo_empresa,
      caixaId: caixa._id,
      codigo_movimento,
      codigo_caixa: caixa.codigo_caixa,
      caixa: caixa.caixa,
      tipo_movimentacao: 'entrada',
      valor: valor_liquidacao,
      origem: 'recebimento',
      documento_origem: receber._id,
      meio_pagamento,
      categoria_contabil: 'receita',
      observacao: observacao || `Liquidação de recebimento ${receber.codigo_receber}`
    });

    // Registrar liquidação
    const liquidacao = {
      valor: valor_liquidacao,
      meio_pagamento,
      movimentacao: novaMovimentacao._id,
      observacao
    };
    receber.liquidacoes.push(liquidacao);

    // Atualizar valores e status
    receber.valor_restante -= valor_liquidacao;

    if (receber.valor_restante === 0) {
      receber.status = 'liquidado';
    } else if (receber.valor_restante > 0) {
      receber.status = 'parcial';
    }

    // Atualizar saldo do caixa (se for dinheiro)
    if (meio_pagamento.toLowerCase() === 'dinheiro') {
      caixa.saldo_final += valor_liquidacao;
      await caixa.save({ session });
    }

    // Salvar movimentação
    await novaMovimentacao.save({ session });
    await receber.save({ session });

    await session.commitTransaction();

    res.status(200).json({
      receber,
      movimentacao: novaMovimentacao
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};
 */
