const mongoose = require('mongoose');

// Schema de Produto
const precosShemas = new mongoose.Schema({
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
  ultimos_precos: {
    ultimo_preco_compra: { type: String },
    ultimo_cma: { type: String },
    ultimo_preco_venda: { type: String },
  },
})

const estoqueShemas = new mongoose.Schema({
  estoque: {
    type: Number,
    default: 0,
    min: 0,
  },
  estoque_deposito: {
    type: Number,
    default: 0,
    min: 0,
  },
  estoque_usado: {
    type: Number,
    default: 0,
    min: 0,
  },
  unidade: {
    type: String,
    enum: ['unidade', 'kg', 'litro', 'caixa'],
    required: true,
  },
  minimo_estoque: {
    type: Number,
    default: 0,
  },
  data_criacao: {
    type: Date,
    default: Date.now,
  },

})

const encargosShemas = new mongoose.Schema({
  cfop: {
    type: String,
    required: true,
  },
})


const produtoSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_produto: {
    type: Number,
    required: true,
  },
  codigo_barras: {
    type: Number,
    required: true,
  },
  descricao: {
    type: String,
    required: true,
  },
  volume: {
    type: String,
    required: true,
  },
  precos: [precosShemas],
  estoque: [estoqueShemas],
  encargos: [encargosShemas],

});

// Índice composto para garantir que `codigo_produto` seja único para cada loja
produtoSchema.index({ lojasNome: 1, codigo_produto: 1 }, { unique: true });

const Produto = mongoose.model('Produto', produtoSchema);

module.exports = Produto;
