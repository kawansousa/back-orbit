const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const RecebimentoSchema = new Schema({
  // Cliente information
  cliente: {
    type: Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  codigo_loja: {
    type: String,
    required: true
  },

  // Invoice/Receivable details
  numero_documento: {
    type: Number,
    required: true,
  },
  valor_total: {
    type: Number,
    required: true
  },
  data_emissao: {
    type: Date,
    default: Date.now
  },
  tipo_documento: {
    type: String,
    enum: ['venda', 'servico', 'outros'],
    required: true
  },

  // Parcelas (Installments)
  parcelas: [{
    numero_parcela: {
      type: Number,
      required: true
    },
    valor_parcela: {
      type: Number,
      required: true
    },
    data_vencimento: {
      type: Date,
      required: true
    },
    status: {
      type: String,
      enum: [
        'aberto',
        'pago',
        'cancelado',
        'vencido',
        'renegociado'
      ],
      default: 'aberto'
    },
    data_pagamento: Date,
    valor_pago: Number,
    juros: Number,
    multa: Number,
    desconto: Number,
    observacoes: String
  }],

  // Status do documento inteiro
  status_documento: {
    type: String,
    enum: [
      'aberto',
      'parcial',
      'liquidado',
      'cancelado',
      'renegociado'
    ],
    default: 'aberto'
  },

  // Informações adicionais
  origem_documento: {
    type: String,
    enum: ['venda', 'servico', 'manual']
  }
});


module.exports = mongoose.model('Receber', RecebimentoSchema);