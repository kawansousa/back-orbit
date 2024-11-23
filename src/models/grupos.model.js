const mongoose = require('mongoose');

// Schema de Cliente
const grupoSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_grupo: {
    type: Number,
  },
  descricao: {
    type: String,
    default: 'nao informado',
  }
});

// Índice composto para garantir que o código do cliente seja único por loja e empresa
// clienteSchema.index({ codigo_loja: 1, codigo_empresa: 1, codigo_cliente: 1 }, { unique: true });

const Grupos = mongoose.model('Grupos', grupoSchema);

module.exports = Grupos;
