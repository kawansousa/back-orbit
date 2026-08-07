const Movimentacao = require("../models/movimentacoes_caixa.model");
const sequenceService = require("../services/sequenceService");

/**
 * Atribui codigo_movimento atômico ao body e (se houver) a cada parcela.
 * Mantém o mesmo contrato do middleware antigo, mas sem race condition.
 */
async function autoIncrementMovimento(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios" });
    }

    const parcelas = Array.isArray(req.body.parcelas) ? req.body.parcelas : [];
    // Comportamento idêntico ao middleware antigo: body recebe o código N e
    // parcela[i] recebe N+i (logo parcela[0] === body). Reservamos um bloco
    // de tamanho = nº de parcelas (mínimo 1) de forma atômica.
    const count = Math.max(1, parcelas.length);

    const codigos = await sequenceService.nextBlock({
      entidade: "movimento",
      Model: Movimentacao,
      codigoField: "codigo_movimento",
      codigo_loja,
      codigo_empresa,
      count,
    });

    req.body.codigo_movimento = codigos[0];

    if (parcelas.length > 0) {
      req.body.parcelas = parcelas.map((parcela, index) => ({
        ...parcela,
        codigo_movimento: codigos[index],
      }));
    }

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = autoIncrementMovimento;
