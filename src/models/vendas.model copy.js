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
    unique: true
  },
  codigo_orcamento_origem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Orcamento'
  },
  status: {
    type: String,
    enum: ['pago', 'cancelado', 'entregue', 'parcialmente_entregue'],
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
  itens: [itemVendaSchema],

  // Informações de Pagamento
  forma_pagamento: {
    type: String,
    enum: ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'boleto', 'transferencia'],
    required: true
  },
  numero_parcelas: {
    type: Number,
    default: 1,
    min: 1
  },

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

  // Informações de Entrega
  entrega: {
    tipo: {
      type: String,
      enum: ['retirada', 'entrega_local', 'envio_transportadora']
    },
    endereco_entrega: {
      type: String
    },
    data_prevista_entrega: {
      type: Date
    },
    data_efetiva_entrega: {
      type: Date
    },
    status_entrega: {
      type: String,
      enum: ['pendente', 'em_separacao', 'enviado', 'entregue']
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

  observacoes: {
    type: String,
    default: ''
  },

  data_emissao: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true  // Adiciona createdAt e updatedAt automaticamente
});

// Índices para melhorar performance
vendaSchema.index({ codigo_venda: 1 });
vendaSchema.index({ cliente: 1 });
vendaSchema.index({ data_emissao: -1 });

// Método para calcular margem de lucro
vendaSchema.methods.calcularMargemLucro = function () {
  const totalCusto = this.itens.reduce((acc, item) => acc + (item.custo_produto * item.quantidade), 0);
  this.valores.total_custo = totalCusto;
  this.valores.margem_lucro = ((this.valores.total - totalCusto) / this.valores.total) * 100;
  return this.valores.margem_lucro;
};

const Venda = mongoose.model('Venda', vendaSchema);

module.exports = Venda;