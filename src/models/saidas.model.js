const mongoose = require('mongoose');

const itensSaidasSchema = new mongoose.Schema({
  codigo_produto: {
    type: Number,
    required: true,
  },
  descricao: {
    type: String,
    required: true,
  },
  quantidade: {
    type: Number,
    required: true,
    min: 0,
  },
  referencia: {
    type: String,
  },
  precos: {
    cma: {
      type: Number,
      min: 0,
    },
  },
});

const saidasSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_saida: {
    type: Number,
    required: true,
  },
  saida: {
    type: String,
    required: true,
  },
  responsavel_saida: {
    type: String,
    required: true
  },
  tipo_saida: {
    type: String,
    enum: ['venda', 'transferencia', 'perda', 'devolucao', 'ajuste', 'uso_interno', 'outros'],
    required: true,
  },
  observacoes: {
    type: String,
  },
  itens: [itensSaidasSchema],
  status: {
    type: String,
    enum: ['pendente', 'concluido', 'cancelado'],
    default: 'concluido',
  },
}, {
  id: false,
  timestamps: true
})

const Saida = mongoose.model('Saida', saidasSchema);
module.exports = Saida;