const mongoose = require('mongoose');

const ReceberSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  codigo_receber: {
    type: Number,
    required: true
  },
  fatura: {
    type: String,
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  origem: {
    type: String,
    required: true,
    enum: ['venda', 'manual', 'outros']
  },
  documento_origem: {
    type: String,
    required: true
  },
  valor_total: {
    type: Number,
    required: true
  },
  valor_restante: {
    type: Number,
    required: true
  },
  data_emissao: {
    type: Date,
    default: Date.now
  },
  data_vencimento: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    required: true,
    enum: ['aberto', 'parcial', 'liquidado', 'cancelado'],
    default: 'aberto'
  },
  liquidacoes: [{
    data: {
      type: Date,
      default: Date.now
    },
    valor: {
      type: Number,
      required: true
    },
    meio_pagamento: {
      type: String,
      required: true,
      enum: ['dinheiro', 'pix', 'cartao_credito', 'cartao_debito', 'cheque' ,'aprazo']
    },
    movimentacao: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Movimentacao'
    },
    observacao: {
      type: String
    },
    estornado: {
      type: Boolean,
      default: false
    }
  }],
  observacao: {
    type: String
  }
}
);

module.exports = mongoose.model('Receber', ReceberSchema);