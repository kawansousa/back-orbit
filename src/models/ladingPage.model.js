const mongoose = require("mongoose");

const LandingPageSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    require: true,
  },
  numero_whatsapp: {
    type: Number,
    require: true,
  },
  numero_telefone: {
    type: Number,
    require: true,
  },
  horario_funcionamento: [
    {
      dia_semana: {
        type: Number,
        required: true,
        min: 0,
        max: 6,
      },
      aberto: {
        type: Boolean,
        default: true,
      },
      intervalos: [
        {
          abre: { type: String, required: true },
          fecha: { type: String, required: true },
        },
      ],
    },
  ],
  mensagem_footer: {
    type: String,
    require: true,
  },
  endereco: {
    logradouro: { type: String, required: true },
    numero: { type: String, required: true },
    complemento: { type: String },
    bairro: { type: String, required: true },
    cidade: { type: String, required: true },
    estado: { type: String, required: true },
    cep: { type: String, required: true },
  },
  instagram: {
    type: String,
  },
  facebook: {
    type: String,
  }
});

const LandingPage = mongoose.model("LandingPage", LandingPageSchema);

module.exports = LandingPage;
