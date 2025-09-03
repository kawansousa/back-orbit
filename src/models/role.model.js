const mongoose = require("mongoose");

const ALL_PERMISSIONS = [
  "usuario:criar",
  "usuario:ler",
  "usuario:atualizar",
  "usuario:deletar",

  "role:criar",
  "role:ler",
  "role:atualizar",
  "role:deletar",

  "cliente:criar",
  "cliente:ler",
  "cliente:atualizar",
  "cliente:deletar",

  "fornecedor:criar",
  "fornecedor:ler",
  "fornecedor:atualizar",
  "fornecedor:deletar",

  "produto:criar",
  "produto:ler",
  "produto:atualizar",
  "produto:deletar",
  "produto:importar",

  "grupo:criar",
  "grupo:ler",
  "grupo:atualizar",
  "grupo:deletar",

  "entrada:criar",
  "entrada:ler",
  "entrada:atualizar",
  "saida:criar",
  "saida:ler",
  "saida:atualizar",

  "venda:criar",
  "venda:ler",
  "venda:atualizar",
  "venda:cancelar",
  "venda:pdf",

  "orcamento:criar",
  "orcamento:ler",
  "orcamento:atualizar",
  "orcamento:cancelar",
  "orcamento:converter",
  "orcamento:pdf",

  "os:criar",
  "os:ler",
  "os:atualizar",
  "os:cancelar",
  "os:faturar",
  "os:pdf",

  "servico:criar",
  "servico:ler",
  "servico:atualizar",
  "servico:inativar",

  "mecanico:criar",
  "mecanico:ler",
  "mecanico:atualizar",
  "mecanico:inativar",
  "mecanico:relatorio",

  "receber:criar",
  "receber:ler",
  "receber:liquidar",
  "receber:cancelar",

  "pagar:criar",
  "pagar:ler",
  "pagar:liquidar",
  "pagar:cancelar",

  "caixa:abrir",
  "caixa:fechar",
  "caixa:ler",
  "caixa:movimentar",
  "caixa:detalhes",
  "caixa:relatorio",

  "conta_bancaria:criar",
  "conta_bancaria:ler",
  "conta_bancaria:atualizar",
  "conta_bancaria:deletar",
  "conta_bancaria:movimentar",

  "loja:criar",
  "empresa:criar",
  "dre:ler",
  "dre:pdf",
  "cidade:ler",

  "admin:full_access",
];

const roleSchema = new mongoose.Schema(
  {
    codigo_loja: {
      type: String,
      required: true,
    },
    codigo_empresa: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    permissions: [
      {
        type: String,
        enum: {
          values: ALL_PERMISSIONS,
          message: "A permissão `{VALUE}` não é válida.",
        },
      },
    ],
  },
  { timestamps: true }
);

const Role = mongoose.model("Role", roleSchema);

module.exports = { Role, ALL_PERMISSIONS };