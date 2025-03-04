const mongoose = require('mongoose');

const ContasBancariasSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  codigo_conta_bancaria: {
    type: Number,
  },
  conta_bancaria: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['ativo', 'inativo'],
    default: 'ativo'
  },
  agencia: {
    type: String,
    required: true
  },
  conta: {
    type: String,
    default: null
  }
});

const ContasBancarias = mongoose.model('ContasBancarias', ContasBancariasSchema);

module.exports =  ContasBancarias ;