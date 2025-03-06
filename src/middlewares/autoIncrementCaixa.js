const Caixa = require('../models/caixa.model');

async function autoIncrementCaixas(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja ,caixa} = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do Caixa para a combinação de loja e empresa
    const lastCaixa = await Caixa.findOne({ codigo_loja, codigo_empresa, caixa })
      .sort({ codigo_caixa: -1 });

    // Definir o próximo código de Caixa
    const nextCodigoCaixa = lastCaixa ? lastCaixa.codigo_caixa + 1 : 1;

    // Adicionar o código de Caixa ao corpo da requisição
    req.body.codigo_caixa = nextCodigoCaixa;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementCaixas;
