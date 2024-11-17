const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const empresaSchema = new mongoose.Schema({
  codigo_empresa: {
    type: Number,
    unique: true,
  },
  razao: {
    type: String,
    required: true,
  },
  nomeFantasia: {
    type: String,
    required: true,
  },
  cnpj: {
    type: String,
    required: true,
    unique: true,
  },
  inscricaoEstadual: {
    type: String,
    required: true,
  },
  inscricaoMunicipal: {
    type: String,
    required: true,
  },
  fone: {
    type: String,
  },
  fone_secundario: {
    type: String,
  },
  email: {
    type: String,
  },
  endereco: {
    logradouro: { type: String },
    numero: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    estado: { type: String },
    cep: { type: String },
  },
  data_criacao_filiao: {
    type: Date,
    default: Date.now,
  },
});

// Definir o schema da loja que inclui várias empresas
const lojaSchema = new mongoose.Schema({
  codigo_loja: {
    type: Number,
    unique: true,
  },
  lojasNome: {
    type: String,
    required: true,
  },
  data_criacao: {
    type: Date,
    default: Date.now,
  },
  responsavel: {
    type: String,
    required: true,
  },
  fone_responsavel: {
    type: String,
  },
  empresas: [empresaSchema],
});

empresaSchema.plugin(AutoIncrement, { inc_field: 'codigo_empresa' });
lojaSchema.plugin(AutoIncrement, { inc_field: 'codigo_loja' });

const Loja = mongoose.model('Loja', lojaSchema);

module.exports = Loja;
