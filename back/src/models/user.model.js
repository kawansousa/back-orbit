const mongoose = require('mongoose');

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
  }
});

// Criar e exportar o modelo
const User = mongoose.model('User', userSchema);
module.exports = User;
