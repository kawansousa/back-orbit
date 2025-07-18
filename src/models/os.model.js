const mongoose = require("mongoose");

const itemOsSchema = new mongoose.Schema(
  {
    codigo_produto: {
      type: Number,
      required: true,
    },
    descricao: {
      type: String,
      required: true,
    },
    preco_unitario: {
      type: Number,
      required: true,
      min: 0,
    },
    quantidade: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal_unitario: {
      type: Number,
      default: 0,
    },
    desconto_percentual: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    desconto_valor: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_unitario: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);
const servicosOsSchema = new mongoose.Schema(
  {
    codigo_servico: {
      type: Number,
      required: true,
    },
    descricao: {
      type: String,
      required: true,
    },
    preco: {
      type: Number,
      required: true,
      min: 0,
    },
    quantidade: {
      type: Number,
      required: true,
      min: 0,
    },
    subtotal_servico: {
      type: Number,
      default: 0,
    },
    desconto_percentual: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    desconto_valor: {
      type: Number,
      default: 0,
      min: 0,
    },
    total_servico: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { _id: false }
);
const pagamentoOsSchema = new mongoose.Schema(
  {
    meio_pagamento: {
      type: String,
      enum: [
        "dinheiro",
        "cartao_credito",
        "cartao_debito",
        "pix",
        "boleto",
        "transferencia",
        "aprazo",
      ],
    },
    valor_pagamento: {
      type: Number,
    },
    parcelas: {
      type: Array,
      valor_total: {
        type: Number,
      },
      data_vencimento: {
        type: Date,
      },
    },
  },
  { _id: false }
);

const OsSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_os: {
    type: Number,
    required: true,
  },
  cliente: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cliente",
  },
  cliente_sem_cadastro: {
    nome: { type: String },
  },
  status: {
    type: String,
    enum: ["pendente", "andamento", "faturado", "cancelada"],
    default: "pendente",
  },
  dataAbertura: { type: Date, default: Date.now },
  dataFechamento: { type: Date },
  responsavel: { type: String },
  telefone: { type: String },
  email: { type: String },
  placaVeiculo: { type: String },
  marcaVeiculo: { type: String },
  modeloVeiculo: { type: String },
  anoVeiculo: { type: String },
  corVeiculo: { type: String },
  observacaoVeiculo: { type: String },
  itens: [itemOsSchema],
  servicos: [servicosOsSchema],
  forma_pagamento: [pagamentoOsSchema],
  observacaoGeral: { type: String },
});

module.exports = mongoose.model("Os", OsSchema);
