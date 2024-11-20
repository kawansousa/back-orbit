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

// Schema de Cliente
const fornecedorSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_fornecedor: {
    type: Number,
    required: true,
  },
  razao: {
    type: String,
    required: true,
  },
  fantasia: {
    type: String,
    required: true,
  },
  cpf: {
    type: String,
  },
  cnpj: {
    type: String,
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
    unique: true,
  },
  endereco: enderecoSchema,
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
fornecedorSchema.index({ codigo_loja: 1, codigo_empresa: 1, codigo_cliente: 1 }, { unique: true });

const Fornecedor = mongoose.model('Fornecedor', fornecedorSchema);

module.exports = Fornecedor;
