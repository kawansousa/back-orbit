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
    ultimo_preco_compra: { type: Number, default: 0 },
    ultimo_cma: { type: Number, default: 0 },
    ultimo_preco_venda: { type: Number, default: 0 },
    ultimo_preco_atacada: { type: Number, default: 0 },
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
    enum: ['und', 'kg', 'litro', 'cx'],
    required: true,
  },
  minimo_estoque: {
    type: Number,
    default: 0,
  }

})

const encargosShemas = new mongoose.Schema({
  ncm: {
    type: Number,
    default: '0'
  },
  cest: {
    type: Number,
    default: '0'
  },
  icms: {
    type: Number,
    default: '0'
  },
  ipi: {
    type: Number,
    default: '0'
  },
  pis: {
    type: Number,
    default: '0'
  },
  cofins: {
    type: Number,
    default: '0'
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
  },
  codigo_barras: {
    type: Number,
  },
  descricao: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'ativo'
  },
  grupo: {
    type: String,
  },
  subgrupo: {
    type: String,
  },
  referencia: {
    type: String,
  },
  volume: {
    type: Number,
    default: 0
  },
  vencimento: {
    type: Date,
  },
  precos: [precosShemas],
  estoque: [estoqueShemas],
  encargos: [encargosShemas],

});

// Índice composto para garantir que `codigo_produto` seja único para cada loja
produtoSchema.index({ lojasNome: 1, codigo_produto: 1 }, { unique: true });

const Produto = mongoose.model('Produto', produtoSchema);

module.exports = Produto;
