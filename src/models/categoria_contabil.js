const mongoose = require('mongoose');


const contasSchema = new mongoose.Schema({
  codigo_pai: {
    type: String,
    required: true
  },
  descricao: {
    type: String,
    required: true
  },
  filhos: {
    codigo_filho: {
      type: String,
      required: true
    },
    descricao: {
      type: String,
      required: true
    },
    tipo_movimentacao: {
      type: String,
      required: true,
      enum: ['receita', 'despesa']
    },
  }

});

const dreSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true
  },
  codigo_empresa: {
    type: String,
    required: true
  },
  receitas_operacional: [contasSchema],
  deducoes: [contasSchema],
  /* Receita liquida */
  custo: [contasSchema],
  /* Lucro bruto */
  despesas_operacionais: [contasSchema],
  /* RESULTADO OPERACIONAL */
  outras_dispesas_receitas: [contasSchema],


});

const DRE = mongoose.model('DRE', dreSchema);

module.exports = DRE;
