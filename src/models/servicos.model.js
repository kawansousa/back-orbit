const mongoose = require("mongoose");

// Schema de Cliente
const servicoSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_servico: {
    type: Number,
  },
  descricao: {
    type: String,
    default: "nao informado",
  },
  preco: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    required: true,
    enum: ["ativo", "inativo"],
    default: "nao informado",
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

// Índice composto para garantir que o código do cliente seja único por loja e empresa
// clienteSchema.index({ codigo_loja: 1, codigo_empresa: 1, codigo_cliente: 1 }, { unique: true });

const Servicos = mongoose.model("servicos", servicoSchema);

module.exports = Servicos;
