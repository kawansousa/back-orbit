const mongoose = require("mongoose");

const LandingPageSchema = new mongoose.Schema({
  codigo_loja: {
    type: String,
    required: true,
  },
  codigo_empresa: {
    type: String,
    required: true,
  },
  company_name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
    unique: true,
  },
  slogan: {
    type: String,
    required: true,
  },
  about: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  whatsapp: {
    type: Number,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  hero_title: {
    type: String,
    required: true,
  },
  features: [
    {
      icon: { type: String },
      title: { type: String },
      description: { type: String },
    },
  ],
  working_hours: [
    {
      dia_semana: {
        type: Number,
        required: true,
        min: 0,
        max: 6,
      },
      open: {
        type: Boolean,
        default: true,
      },
      intervals: [
        {
          open: { type: String, required: true },
          closes: { type: String, required: true },
        },
      ],
    },
  ],
  address: {
    logradouro: { type: String, required: true },
    numero: { type: String, required: true },
    complemento: { type: String },
    bairro: { type: String, required: true },
    cidade: { type: String, required: true },
    estado: { type: String, required: true },
    cep: { type: String, required: true },
  },
  social: [
    {
      instagram: {
        type: String,
      },
      facebook: {
        type: String,
      },
    },
  ],
  location: {
    type: String,
  },
  price: {
    type: Boolean,
    required: true
  }
});

const LandingPage = mongoose.model("LandingPage", LandingPageSchema);

module.exports = LandingPage;