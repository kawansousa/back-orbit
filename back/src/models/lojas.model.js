const mongoose = require('mongoose');
const AutoIncrement = require('mongoose-sequence')(mongoose);

const empresaSchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
  },
  nome: {
    type: String,
    required: true,
  },
  cnpj: {
    type: String,
    required: true,
    unique: true,
  },
  telefone: {
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
  inscricaoEstadual: { type: String },
  inscricaoMunicipal: { type: String },
  razaoSocial: { type: String },
  nomeFantasia: { type: String },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Definir o schema da loja que inclui várias empresas
const lojaSchema = new mongoose.Schema({
  lojasNome: {
    type: String,
    required: true,
  },
  empresas: [empresaSchema],
});

empresaSchema.plugin(AutoIncrement, { inc_field: 'id' });

const Loja = mongoose.model('Loja', lojaSchema);

module.exports = Loja;
