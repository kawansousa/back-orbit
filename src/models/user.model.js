const mongoose = require('mongoose');

const acessoEmpresasSchema = new mongoose.Schema({
  codigo_loja: {
    type: Number,
  },
  codigo_empresas: {
    codigo: { type: Number },
    nome: { type: String },
  },
});


const permissionsSchema = new mongoose.Schema({
  permissoes: {
    vendas: {
      desconto_limite: { type: Number, default: 0 },
      alterar: { type: Boolean, default: true },
      cancelar: { type: Boolean, default: true },
    },
    cadastro: {
      fornecedor: { type: Boolean, default: true },
      cliente: { type: Boolean, default: true },
      grupo: { type: Boolean, default: true },
      usuario: { type: Boolean, default: true },
    },
    acessos: {
      dashboard: { type: Boolean, default: true },
      produto: { type: Boolean, default: true },
      entrada: { type: Boolean, default: true },
      saida: { type: Boolean, default: true },
      etiqueta: { type: Boolean, default: true },
      fornecedor: { type: Boolean, default: true },
      cliente: { type: Boolean, default: true },
      grupo: { type: Boolean, default: true },
      usuario: { type: Boolean, default: true },
      pdv: { type: Boolean, default: true },
      orcamentos: { type: Boolean, default: true },
      os: { type: Boolean, default: true },
      servicos: { type: Boolean, default: true },
      mecanicos: { type: Boolean, default: true },
      caixa: { type: Boolean, default: true },
      receber: { type: Boolean, default: true },
      pagar: { type: Boolean, default: true },
      gestao: { type: Boolean, default: true },
      relatorios: { type: Boolean, default: true }
    }
  }
});

// Definição correta do Schema (sem o "s" no final)
const userSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  acesso_loja: [acessoEmpresasSchema],

  type: {
    type: String,
    required: true,
    enum: ['Administrador', 'Gerente', 'Caixa', 'Estoquista'],
  },
  permissions: [permissionsSchema]

});

// Criar e exportar o modelo
const User = mongoose.model('User', userSchema);

module.exports = User;
