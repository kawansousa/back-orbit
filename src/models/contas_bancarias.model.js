const mongoose = require("mongoose");

const ContasBancariasSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_conta_bancaria: {
    type: Number,
    require: true,
  },
  conta_bancaria: {
    type: String,
    required: true,
  },
  tipo: {
    type: String,
    enum: ["corrente", "poupanca"],
  },
  status: {
    type: String,
    enum: ["ativo", "inativo"],
    default: "ativo",
  },
  conta_padrao: {
    type: Boolean,
    default: false,
  },
  agencia: {
    type: String,
    required: true,
  },
  conta: {
    type: String,
    default: null,
    require: true,
  },
  limite: {
    type: Number,
    require: true,
  },
  saldo: {
    type: Number,
    require: true,
  },
});

const ContasBancarias = mongoose.model(
  "ContasBancarias",
  ContasBancariasSchema
);

module.exports = ContasBancarias;
