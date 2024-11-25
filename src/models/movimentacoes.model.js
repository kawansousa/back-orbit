const mongoose = require('mongoose');

// Model de Movimentação
const MovimentacaoSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  codigo_movimento: {
    type: Number,
  },
  caixaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caixa',
  },
  caixa: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['ativo', 'inativo'],
    default: 'ativo'
  },
  tipo_movimentacao: {
    type: String,
    required: true,
    enum: ['entrada', 'saida', 'transferencia']
  },
  valor: {
    type: Number,
    required: true
  },
  origem: {
    type: String,
    required: true,
    enum: ['receber', 'venda', 'producao', 'transferencia', 'ajuste_estoque', 'devolucao_cliente', 'devolucao_fornecedor', 'caixa_manual']
  },
  documento_origem: {
    type: String,
    required: true
  },
  data_movimentacao: {
    type: Date,
    default: Date.now
  },
  meio_pagamento: {
    type: String,
    required: true,
    enum: ['dinehiro', 'pix', 'cartao_credito', 'cartao_debito', 'cheque']
  },
  categoria_contabil: {
    type: String,
    required: true
  },
  obsevacao: {
    type: String,
    required: true
  },
});

const Movimentacao = mongoose.model('Movimentacao', MovimentacaoSchema);

module.exports = Movimentacao;