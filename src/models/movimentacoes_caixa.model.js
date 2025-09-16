const mongoose = require("mongoose");

// Model de Movimentação
const MovimentacaoCaixaSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_movimento: {
    type: Number,
  },
  codigo_conta_bancaria: {
    type: Number,
  },
  caixaId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Caixa",
  },
  caixa: {
    type: Number,
  },
  codigo_caixa: {
    type: Number,
  },
  status: {
    type: String,
    required: true,
    enum: ["ativo", "inativo"],
    default: "ativo",
  },
  tipo_movimentacao: {
    type: String,
    required: true,
    enum: ["entrada", "saida", "transferencia"],
  },
  valor: {
    type: Number,
    required: true,
  },
  origem: {
    type: String,
    required: true,
    enum: [
      "recebimento",
      "estorno_recebimento",
      "venda",
      "os",
      "receber",
      "pagar",
      "cancelamento_venda",
      "cancelamento_os",
      "producao",
      "transferencia",
      "ajuste_estoque",
      "devolucao_cliente",
      "devolucao_fornecedor",
      "caixa_manual",
      "banco_manual"
    ],
  },
  documento_origem: {
    type: String,
    required: true,
  },
  data_movimentacao: {
    type: Date,
    default: Date.now,
  },
  meio_pagamento: {
    type: String,
    required: true,
    enum: [
      "dinheiro",
      "pix",
      "cartao_credito",
      "cartao_debito",
      "cheque",
      "boleto",
      "aprazo",
      "transferencia",
    ],
  },
  categoria_contabil: {
    type: String,
    required: true,
  },
  observacao: {
    type: String,
  },
  historico: {
    type: String,
  },
});

const MovimentacaoCaixa = mongoose.model(
  "MovimentacaoCaixa",
  MovimentacaoCaixaSchema
);

module.exports = MovimentacaoCaixa;
