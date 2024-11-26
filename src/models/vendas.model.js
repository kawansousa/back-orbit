const mongoose = require('mongoose');

// Schema de Item da Venda
const itemVendaSchema = new mongoose.Schema({
  codigo_produto: {
    type: String,
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

const receberVendaSchema = new mongoose.Schema({
  numero_parcelas: {
    type: Number,
    default: 1,
    min: 1
  },

  parcelamento: {
    fatura: {
      type: String,
    },
    parcela: {
      type: String,
    },
    valor_parcela: {
      type: Number,
    },
    descricao: {
      type: String,
      default: 0,
      default: ''
    },
    data_pagamento: {
      type: Date,
    }
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
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  vendedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Usuario',
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
  faturamento: [receberVendaSchema],

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

// Índices para melhorar performance
vendaSchema.index({ codigo_venda: 1 });
vendaSchema.index({ cliente: 1 });
vendaSchema.index({ data_emissao: -1 });

const Venda = mongoose.model('Venda', vendaSchema);

module.exports = Venda;