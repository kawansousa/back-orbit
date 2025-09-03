const mongoose = require("mongoose");

const acessoEmpresasSchema = new mongoose.Schema({
  codigo_loja: {
    type: Number,
  },
  codigo_empresas: {
    codigo: { type: Number },
    nome: { type: String },
  },
});

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  acesso_loja: [acessoEmpresasSchema],

  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Role",
    required: true,
  },
});

const User = mongoose.model("User", userSchema);
module.exports = User;
