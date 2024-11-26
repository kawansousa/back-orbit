const Movimentacao = require('../models/movimentacoes.model');

async function autoIncrementMovimento(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do Movimento para a combinação de loja e empresa
    const lastMovimento = await Movimentacao.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_movimento: -1 });

    // Definir o próximo código de Movimento inicial
    let nextCodigoMovimento = lastMovimento ? lastMovimento.codigo_movimento + 1 : 1;

    // Adicionar o código de Movimento a cada movimentação no corpo da requisição
    if (req.body.parcelas && Array.isArray(req.body.parcelas)) {
      req.body.parcelas = req.body.parcelas.map((parcela, index) => ({
        ...parcela,
        codigo_movimento: nextCodigoMovimento + index
      }));
    } else {
      req.body.codigo_movimento = nextCodigoMovimento;
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementMovimento;
