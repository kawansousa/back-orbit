const mongoose = require('mongoose');

// Schema de Item do Orçamento
const itemOrcamentoSchema = new mongoose.Schema({
  codigo_produto: {
    type: String,
    required: true
  },
  descricao: {
    type: String,
    required: true
  },
  quantidade: {
    type: Number,
    required: true,
    min: 0
  },
  preco_unitario: {
    type: Number,
    required: true,
    min: 0
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
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

// Schema de Forma de Pagamento
const formaPagamentoSchema = new mongoose.Schema({
  tipo: {
    type: String,
    required: true,
    enum: ['dinheiro', 'cartao_credito', 'cartao_debito', 'boleto', 'pix', 'cheque', 'crediario']
  },
  parcelas: {
    type: Number,
    default: 1,
    min: 1
  },
  valor_parcela: {
    type: Number,
    required: true,
    min: 0
  },
  data_primeiro_vencimento: {
    type: Date,
    required: true
  }
}, { _id: false });

// Schema principal de Orçamento
const orcamentoSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  numero_orcamento: {
    type: Number,
    required: true,
    unique: true
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  data_emissao: {
    type: Date,
    default: Date.now
  },
  data_validade: {
    type: Date,
    required: true
  },
  vendedor: {
    codigo: { type: String, required: true },
    nome: { type: String, required: true }
  },
  
  itens: [itemOrcamentoSchema],
  formas_pagamento: [formaPagamentoSchema],
  observacoes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['aberto', 'aprovado', 'reprovado', 'cancelado', 'transformado_pedido'],
    default: 'aberto'
  },
  valores: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    desconto_total: {
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
  historico: [{
    data: { type: Date, default: Date.now },
    status_anterior: { type: String },
    status_novo: { type: String },
    usuario: { type: String },
    observacao: { type: String }
  }]
}, {
  timestamps: true // Adiciona createdAt e updatedAt automaticamente
});

// Índices
orcamentoSchema.index({ codigo_loja: 1, codigo_empresa: 1, numero_orcamento: 1 }, { unique: true });
orcamentoSchema.index({ cliente: 1 });
orcamentoSchema.index({ status: 1 });
orcamentoSchema.index({ data_emissao: 1 });

// Middleware para atualizar valores totais antes de salvar
orcamentoSchema.pre('save', function (next) {
  // Calcula subtotal
  this.valores.subtotal = this.itens.reduce((acc, item) => acc + item.subtotal, 0);

  // Calcula desconto total
  this.valores.desconto_total = this.itens.reduce((acc, item) => {
    const descontoItem = (item.desconto_percentual / 100 * item.preco_unitario * item.quantidade) + item.desconto_valor;
    return acc + descontoItem;
  }, 0);

  // Calcula total final
  this.valores.total = this.valores.subtotal - this.valores.desconto_total;

  next();
});

const Orcamento = mongoose.model('Orcamento', orcamentoSchema);

module.exports = Orcamento;