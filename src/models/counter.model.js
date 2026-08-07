const mongoose = require("mongoose");

/**
 * Contador atômico de sequências.
 *
 * Cada documento representa uma sequência única, identificada por `_id`
 * no formato:  "<entidade>:<codigo_loja>:<codigo_empresa>"
 * (ex: "os:1:001", "venda:1:001").
 *
 * O incremento é feito com findOneAndUpdate + $inc, que é ATÔMICO no MongoDB:
 * dois requests concorrentes nunca recebem o mesmo número.
 */
const counterSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false }
);

module.exports = mongoose.model("Counter", counterSchema);
