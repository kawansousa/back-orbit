const sequenceService = require("../services/sequenceService");

/**
 * Middleware genérico de auto-increment ATÔMICO para qualquer model Mongoose.
 *
 * Usa o sequenceService (findOneAndUpdate + $inc) — sem race condition.
 * Substitui os ~20 middlewares antigos que faziam findOne().sort()+1.
 *
 * @param {import('mongoose').Model} Model
 * @param {string} codigoField - Campo de código a gerar (ex: 'codigo_produto')
 * @param {Object} [options]
 * @param {string} [options.entidade] - Nome lógico da sequência (default: codigoField sem "codigo_")
 * @param {string} [options.extraScopeBodyField] - Campo do body que discrimina a sequência (ex: 'origem' p/ vendas)
 * @param {boolean} [options.applyToParcelas] - Se true, gera um bloco de códigos e atribui a cada item de req.body.parcelas
 * @param {boolean} [options.alsoSetOnBody] - Em modo parcelas, também grava o 1º código em req.body[codigoField] (default p/ movimento)
 * @returns {Function} Express middleware
 */
function autoIncrement(Model, codigoField, options = {}) {
  const entidade =
    options.entidade || codigoField.replace(/^codigo_/, "");

  return async (req, res, next) => {
    try {
      const { codigo_loja, codigo_empresa } = req.body;

      if (!codigo_loja || !codigo_empresa) {
        return res
          .status(400)
          .json({ error: "Código da loja e empresa são obrigatórios." });
      }

      const extra = options.extraScopeBodyField
        ? req.body[options.extraScopeBodyField]
        : undefined;

      const baseArgs = {
        entidade,
        Model,
        codigoField,
        codigo_loja,
        codigo_empresa,
        extra,
        extraField: options.extraScopeBodyField,
      };

      if (options.applyToParcelas) {
        const parcelas = Array.isArray(req.body.parcelas)
          ? req.body.parcelas
          : [];

        if (parcelas.length > 0) {
          const codigos = await sequenceService.nextBlock({
            ...baseArgs,
            count: parcelas.length,
          });
          req.body.parcelas = parcelas.map((parcela, i) => ({
            ...parcela,
            [codigoField]: codigos[i],
          }));
          if (options.alsoSetOnBody) {
            req.body[codigoField] = codigos[0];
          }
        } else if (options.alsoSetOnBody) {
          req.body[codigoField] = await sequenceService.next(baseArgs);
        }
      } else {
        req.body[codigoField] = await sequenceService.next(baseArgs);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = autoIncrement;
