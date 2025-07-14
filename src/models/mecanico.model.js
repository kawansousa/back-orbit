const mongoose = require("mongoose");

// Schema de Mecânico
const mecanicoSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_mecanico: {
    type: Number,
    required: true,
  },
  comissao: {
    type: Number,
    default: 0,
  },
  nome: {
    type: String,
    required: true,
    default: "não informado",
  },
  especialidade: {
    type: String,
    default: "não informado",
  },
  telefone: {
    type: String,
    default: "não informado",
  },
  status: {
    type: String,
    required: true,
    enum: ["ativo", "inativo"],
    default: "ativo",
  },
  data_criacao: {
    type: Date,
    default: Date.now,
  },
  data_atualizacao: {
    type: Date,
    default: Date.now,
  },
});

const Mecanico = mongoose.model("Mecanico", mecanicoSchema);

module.exports = Mecanico;
