const Saida = require('../models/saidas.model');

async function autoIncrementSaida(req, res, next) {
  try {
    if (req.method !== 'POST') {
      return next();
    }

    const { codigo_empresa, codigo_loja } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    const lastSaida = await Saida.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_saida: -1 });

    const nextCodigoSaida = lastSaida ? lastSaida.codigo_saida + 1 : 1;

    req.body.codigo_saida = nextCodigoSaida;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementSaida;