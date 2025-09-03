const mongoose = require("mongoose");

const enderecoSchema = new mongoose.Schema(
  {
    endereco: { type: String },
    numero: { type: String },
    bairro: { type: String },
    cidade: { type: String },
    estado: { type: String },
    cep: { type: String },
  },
  { _id: false }
);

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
  },
  razao_social: {
    type: String,
    default: "",
  },
  nome_fantasia: {
    type: String,
    default: "",
  },
  cnpj: {
    type: String,
    required: true,
  },
  ie: {
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
  },
  endereco: enderecoSchema,
  status: {
    type: String,
    default: "ativo",
  },
  data_cadastro: {
    type: Date,
    default: Date.now,
  },
});

const Fornecedor = mongoose.model("Fornecedor", fornecedorSchema);

module.exports = Fornecedor;
