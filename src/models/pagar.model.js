const mongoose = require("mongoose");

const PagarSchema = new mongoose.Schema({
  codigo_loja: {
    type: String, 
    required: true,
  },
  codigo_empresa: {
    type: String, 
    required: true,
  },
  codigo_pagar: {
    type: Number, 
    required: true,
  },
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Fornecedor",
  },
    fatura: {
    type: String,
  },
  descricao: {
    type: String,
    required: true,
  },
  origem: {
    type: String,
    required: true,
    enum: ["entrada", "manual"],
  },
  documento_origem: {
    type: String,
    required: true,
  },
  valor_total: {
    type: Number,
    required: true,
  },
  valor_restante: {
    type: Number,
    required: true,
  },
  data_emissao: {
    type: Date,
    default: Date.now,
  },
  data_vencimento: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    required: true,
    enum: ["aberto", "parcial", "liquidado", "cancelado"],
    default: "aberto",
  },
  liquidacoes: [
    {
      data: {
        type: Date,
        default: Date.now,
      },
      valor: {
        type: Number,
        required: true,
      },
      forma_pagamento: {
        type: String,
        required: true,
      },
      observacao: {
        type: String,
      },
    },
  ],
  observacao: {
    type: String,
  },
  categoria: {
    type: String,
    enum: ["servicos", "aluguel", "contas_consumo", "outros"],
    required: true,
  },
})

const Pagar = mongoose.model('Pagar', PagarSchema);
module.exports = Pagar;

