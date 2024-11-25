const mongoose = require('mongoose');

// Schema principal de Movimentação
const caixaSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  numero_caixa: {
    type: Number,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['aberto', 'fechado'],
    default: 'aberto'
  },
  responsavel_abeertura: {
    type: String,
    required: true
  },
  responsavel_fechamento: {
    type: String,
    required: true
  },
  data_abertura: {
    type: Date,
    default: Date.now
  },
  data_fechamento: {
    type: Date,
    required: true
  },
  saldo_anterior: {
    type: String
  }
}, {
  timestamps: true
});


const caixa = mongoose.model('caixa', caixaSchema);

module.exports = caixa;