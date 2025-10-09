const mongoose = require('mongoose');

const parcelasSchema = new mongoose.Schema(
  {
    valor_total: {
      type: Number,
    },
    data_vencimento: {
      type: Date,
    },
  },
  { _id: false }
);

const dadosTransferenciaSchema = new mongoose.Schema({
  codigo_conta_bancaria: {
    type: Number,
  },
  conta_bancaria: {
    type: String,
  },
  agencia : {
    type: Number, 
  },
  conta: {
    type: Number,
  }
})

const pagamentoSchema = new mongoose.Schema({
  meio_pagamento: {
    type: String,
    enum: [
      "dinheiro",
      "cartao_credito",
      "cartao_debito",
      "pix",
      "boleto",
      "transferencia",
      "aprazo",
    ],
  },
  dados_transferencia: dadosTransferenciaSchema,
  valor_pagamento: {
    type: Number,
  },
  parcelas: [parcelasSchema],
},
  { _id: false }
);

const itensEntradasSchema = new mongoose.Schema({
  codigo_produto: {
    type: Number,
    required: true,
  },
  descricao: {
    type: String,
    required: true,
  },
  quantidade: {
    type: Number,
    required: true,
    min: 0,
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
    },
    lucro_venda: {
      type: Number,
      require: true,
      min: 0.
    },
    lucro_atacado: {
      type: Number,
      require: true,
      min: 0.
    },
  },
});

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
  forma_pagamento: [pagamentoSchema],
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
    required: true,
  },
  itens: [itensEntradasSchema],
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
}, {
  id: false,
  timestamps: true
});

const Entrada = mongoose.model('Entrada', entradaSchema);
module.exports = Entrada;
