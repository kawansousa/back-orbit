const mongoose = require('mongoose');

// Schema de Endereço
const enderecoSchema = new mongoose.Schema({
  logradouro: { type: String },
  rua: { type: String },
  numero: { type: String },
  bairro: { type: String },
  cidade: { type: String },
  estado: { type: String },
  cep: { type: String },
}, { _id: false });

// Schema de Conjugue
const conjugueSchema = new mongoose.Schema({
  nome: { type: String },
  apelido: { type: String },
  cpf: { type: String },
  cnpj: { type: String },
  fone: { type: String },
  fone_secundario: { type: String },
  email: { type: String },
  telefone: { type: String },
  endereco: enderecoSchema,
}, { _id: false });

// Schema de Cliente
const clienteSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_cliente: {
    type: Number,
    required: true,
    unique: true
  },
  cpf: {
    type: String,
    default: '',
  },
  rg: {
    type: String,
    default: '',
  },
  nome: {
    type: String,
    default: '',
  },
  apelido: {
    type: String,
    default: '',
  },
  cnpj: {
    type: String,
    default: '',
  },
  ie: {
    type: String,
    default: '',
  },
  fone: {
    type: String,
  },
  fone_secundario: {
    type: String,
  },
  email: {
    type: String,
    required: true,
  },
  tipo: {
    type: String,
    required: true,
  },
  endereco: enderecoSchema,
  conjugue: conjugueSchema,
  status: {
    type: String,
    default: 'ativo', // 'ativo', 'inativo'
  },
  data_cadastro: {
    type: Date,
    default: Date.now,
  },
});

// Índice composto para garantir que o código do cliente seja único por loja e empresa
clienteSchema.index({ codigo_loja: 1, codigo_empresa: 1, codigo_cliente: 1 }, { unique: true });

const Cliente = mongoose.model('Cliente', clienteSchema);

module.exports = Cliente;
