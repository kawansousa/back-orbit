const mongoose = require('mongoose');

const acessoEmpresasSchema = new mongoose.Schema({
  codigo_loja: {
    type: Number,
  },
  codigo_empresas: {
    codigo: { type: Number },
  },
});


const configuracoesSchema = new mongoose.Schema({
  permissoes: {
    vendas: {
      desconto_limite: { type: Number, default: 0 },
      alterar: { type: Boolean, default: true },
      cancelar: { type: Boolean, default: true },
    },
    produtos: {
      cadastrar: { type: Boolean, default: true },
      alterar: { type: Boolean, default: true },
    },
    receber: { type: Boolean, default: true },
    pagar: { type: Boolean, default: true },
    cadastrar: {
      cliente: { type: Boolean, default: true },
      fornecedor: { type: Boolean, default: true },
      usuario: { type: Boolean, default: true },
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
  },

  permissions: {
    type: String,
    required: true,
  },
  configurações: [configuracoesSchema]

});

// Criar e exportar o modelo
const User = mongoose.model('User', userSchema);

module.exports = User;
