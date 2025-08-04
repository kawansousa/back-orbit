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
    // required: true,
  },
  localizacao: {
    type: String,
    // required: true,
  },
  ncm: {
    type: String,
    required: true,
  },
  precos: {
    preco_compra: {
      type: Number,
      required: true,
      min: 0,
    },
    cma: {
      type: Number,
      required: true,
      min: 0,
    },
    preco_venda: {
      type: Number,
      required: true,
      min: 0,
    },
    preco_atacado: {
      type: Number,
      required: true,
      min: 0,
    },
    lucro_venda: {
      type: Number,
      require: true,
      min: 0.
    },
    lucro_atacado: {
      type: Number,
      require: true,
      min: 0.
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
  itens: [itensSaidasSchema],
  status: {
    type: String,
    enum: ['ativo', 'inativo'],
    default: 'ativo',
  },
}, {
  id: false,
  timestamps: true
})

const Saida = mongoose.model('Saida', saidasSchema);
module.exports = Saida;