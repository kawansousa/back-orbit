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
  codigo_orcamento: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['aberto', 'cancelado', 'cancelado', 'transformado_pedido'],
    default: 'aberto'
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cliente',
    required: true
  },
  cliente_sem_cadastro: {
    nome: { type: String },
  },
  vendedor: {
    type: String,
    required: true
  },
  itens: [itemOrcamentoSchema],
  observacoes: {
    type: String,
    default: ''
  },
  data_emissao: {
    type: Date,
    default: Date.now
  },
  valores: {
    subtotal: {
      type: Number,
      required: true,
      min: 0
    },
    desconto_percentual_total: {
      type: Number,
      default: 0,
      min: 0
    },
    desconto_valor__total: {
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
  }],
  observacao: { type: String }
})

const Orcamento = mongoose.model('Orcamento', orcamentoSchema);

module.exports = Orcamento;