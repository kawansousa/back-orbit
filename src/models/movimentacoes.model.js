const mongoose = require('mongoose');

// Schema principal de Movimentação
const movimentacaoSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  numero_movimentacao: {
    type: Number,
    required: true,
    unique: true
  },
  tipo_movimentacao: {
    type: String,
    required: true,
    enum: ['entrada', 'saida', 'transferencia']
  },
  origem: {
    type: String,
    required: true,
    enum: ['compra', 'venda', 'producao', 'transferencia', 'ajuste_estoque', 'devolucao_cliente', 'devolucao_fornecedor']
  },
  documento_origem: {
    tipo: {
      type: String,
      required: true,
      enum: ['nota_fiscal', 'pedido', 'ordem_producao', 'requisicao']
    },
    numero: {
      type: String,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['aberto', 'fechado'],
    default: 'aberto'
  },
  responsavel: {
    type: String,
    required: true
  },
  data_movimentacao: {
    type: Date,
    default: Date.now
  },
  data_documento: {
    type: Date,
    required: true
  },
  observacoes: {
    type: String
  }
}, {
  timestamps: true
});


const Movimentacao = mongoose.model('Movimentacao', movimentacaoSchema);

module.exports = Movimentacao;