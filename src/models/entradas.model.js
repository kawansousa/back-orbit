const mongoose = require('mongoose');

const itensEntradasShemas = new mongoose.Schema({
  codigo_produto: {
    type: Number,
    required: true
  },
  descricao: {
    type: String,
    required: true
  },
  quantidade: {
    type: Number,
    required: true,
    min: 0
  },
  referencia: {
    type: String,
    required: true,
  },
  localizacao: {
    type: String,
    required: true,
  },
  ncm: {
    type: String,
    required: true,
  },
  precos: {
    preco_compra: {
      type: Number,
      required: true,
      min: 0,
    },
    cma: {
      type: Number,
      required: true,
      min: 0,
    },
    preco_venda: {
      type: Number,
      required: true,
      min: 0,
    },
    preco_atacado: {
      type: Number,
      required: true,
      min: 0,
    }
  }
})

// Schema de Enquete
const entradaSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  codigo_entrada: {
    type: Number,
    required: true,
  },
  entrada: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['ativo', 'inativo'],
    default: 'ativo',
  },
  xml: {
    type: String,
  },
  fornecedor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fornecedor',
    required: true
  },
  itens: [itensEntradasShemas],
  encargos: {
    cest: {
      type: Number,
      default: 0,
    },
    icms: {
      type: Number,
      default: 0,
    },
    ipi: {
      type: Number,
      default: 0,
    },
    pis: {
      type: Number,
      default: 0,
    },
    cofins: {
      type: Number,
      default: 0,
    },
  },
});


const Entrada = mongoose.model('Entrada', entradaSchema);

module.exports = Entrada;
