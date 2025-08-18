const mongoose = require('mongoose');

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
  },
  status: {
    type: String,
    required: true,
    enum: ['ativo', 'cancelado'],
  },
});


const Grupos = mongoose.model('Grupos', grupoSchema);
module.exports = Grupos;
