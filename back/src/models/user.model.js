const mongoose = require('mongoose');

const acessoEmpresasSchema = new mongoose.Schema({
  codigo_loja: {
    type: Number,
  },
  codigo_empresas: {
    codigo: { type: Number },
  },
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

});

// Criar e exportar o modelo
const User = mongoose.model('User', userSchema);

module.exports = User;
