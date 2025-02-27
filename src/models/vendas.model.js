const mongoose = require('mongoose');

// Schema de Item da Venda
const itemVendaSchema = new mongoose.Schema({
  codigo_produto: {
    type: Number,
    required: true
  },
  descricao: {
    type: String,
    required: true
  },
  preco_unitario: {
    type: Number,
    required: true,
    min: 0
  },
  quantidade: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal_unitario: {
    type: Number,
    default: 0,
  },
  desconto_percentual: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  desconto_valor: {
    type: Number,
    default: 0,
    min: 0
  },
  total_unitario: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const parcelasVendaSchema = new mongoose.Schema({
  valor_total: {
    type: Number,
  },
  descricao: {
    type: String,
    default: 0,
    default: ''
  },
  data_vencimento: {
    type: Date,
  }

}, { _id: false });

const pagamentoVendaSchema = new mongoose.Schema({
  meio_pagamento: {
    type: String,
    enum: ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto', 'transferencia', 'aprazo'],
    required: true
  },
  valor_pagamento: {
    type: Number,
    required: true
  }
}, { _id: false });

// Schema principal de Venda
const vendaSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  codigo_venda: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['pago', 'cancelado'],
    default: 'pago'
  },
  tipo: {
    type: String,
    enum: ['avista', 'aprazo'],
  },
  origem: {
    type: String,
    enum: ['web', 'pdv_offline-1'],
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
  },
  cliente_sem_cadastro: {
    nome: { type: String },
  },
  vendedor: {
    type: String,
    required: true
  },
  observacoes: {
    type: String,
    default: ''
  },

  data_emissao: {
    type: Date,
    default: Date.now
  },

  itens: [itemVendaSchema],
  forma_pagamento: [pagamentoVendaSchema],
  parcelas: [parcelasVendaSchema],

  // Valores
  valores: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    desconto_percentual_total: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    desconto_valor_total: {
      type: Number,
      default: 0,
      min: 0
    },
    total: {
      type: Number,
      required: true,
      min: 0
    }
  },

  // Rastreamento de Status
  historico: [{
    data: {
      type: Date,
      default: Date.now
    },
    status_anterior: {
      type: String
    },
    status_novo: {
      type: String
    },
    usuario: {
      type: String
    },
  }],

});


const Venda = mongoose.model('Venda', vendaSchema);

module.exports = Venda;