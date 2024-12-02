const mongoose = require('mongoose');
const incrementarCodigos = require('../middlewares/incrementarCodigos');

const configuracoesSchema = new mongoose.Schema({
  fiscal: {
    token_homologacao_fiscal: { type: String },
    token_produçao_fiscal: { type: String },
    referencia_homologacao: { type: String },
    referencia_producao: { type: String },
  },
  logo: { type: String },
});

// Schema de Empresa
const empresaSchema = new mongoose.Schema({
  codigo_empresa: { type: Number },
  razao: { type: String, required: true },
  nomeFantasia: { type: String, required: true },
  cnpj: { type: String, required: true, unique: true },
  inscricaoEstadual: { type: String, required: true },
  inscricaoMunicipal: { type: String, required: true },
  fone: { type: String },
  fone_secundario: { type: String },
  email: { type: String },
  endereco: {
    logradouro: { type: String },
    numero: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    estado: { type: String },
    cep: { type: String },
  },
  data_criacao_filiao: { type: Date, default: Date.now },
  configuracao: [configuracoesSchema],
  logo: { type: String, default: '' },
  rodape: { type: String, default: '' }
});

// Schema da Loja
const lojaSchema = new mongoose.Schema({
  codigo_loja: { type: Number, unique: true },
  lojasNome: { type: String, required: true },
  responsavel: { type: String, required: true },
  fone_responsavel: { type: String },
  empresas: [empresaSchema],
  data_criacao: { type: Date, default: Date.now },
});

// Aplicando o middleware
lojaSchema.pre('save', incrementarCodigos);

const Loja = mongoose.model('Loja', lojaSchema);

module.exports = Loja;
