const Receber = require("../models/receber.model");
const sequenceService = require("../services/sequenceService");

/**
 * Atribui codigo_receber atômico a cada parcela de req.body.parcelas.
 * Mantém o mesmo contrato do middleware antigo, mas sem race condition.
 */
async function autoIncrementreceber(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja, parcelas } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios" });
    }

    if (Array.isArray(parcelas) && parcelas.length > 0) {
      const codigos = await sequenceService.nextBlock({
        entidade: "receber",
        Model: Receber,
        codigoField: "codigo_receber",
        codigo_loja,
        codigo_empresa,
        count: parcelas.length,
      });

      req.body.parcelas = parcelas.map((parcela, index) => ({
        ...parcela,
        codigo_receber: codigos[index],
      }));
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = autoIncrementreceber;
