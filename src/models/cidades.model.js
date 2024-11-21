const mongoose = require('mongoose');

// Schema de Cliente
const cidadesSchema = new mongoose.Schema({
  codigo: {
    type: Number,
    required: true,
  },
  nome: {
    type: String,
    required: true,
  },
  uf: {
    type: Number,
    unique: true
  },
  codigo_ibge: {
    type: Number,
    required: true,
  }
});

const Cidades = mongoose.model('Cidades', cidadesSchema);

module.exports = Cidades;