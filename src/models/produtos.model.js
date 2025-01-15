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
  },
  estoque_deposito: {
    type: Number,
    default: 0,
  },
  estoque_usado: {
    type: Number,
    default: 0,
  },
  unidade: {
    type: String,
    enum: ['UN', 'KG', 'L', 'CX', 'PCT', 'SC', 'TON'],
    required: true,
  },
  minimo_estoque: {
    type: Number,
  }

})

const configuracoesShemas = new mongoose.Schema({
  controla_estoque: {
    type: String,
    default: 'SIM',
    enum: ['SIM', 'NAO', 'PERMITE_NEGATIVO'],

  },
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
  codigo_fabricante: {
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
  localizacao: {
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
  configuracoes: [configuracoesShemas],

});

const Produto = mongoose.model('Produto', produtoSchema);

module.exports = Produto;
