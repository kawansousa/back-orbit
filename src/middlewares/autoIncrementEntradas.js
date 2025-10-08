const Entrada = require('../models/entradas.model');

async function autoIncrementEntrada(req, res, next) {
  try { 
    if (req.method !== 'POST') {
      return next();
    }

    const { codigo_empresa, codigo_loja } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    const lastEntrada = await Entrada.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_entrada: -1 });

    const nextCodigoEntrada = lastEntrada ? lastEntrada.codigo_entrada + 1 : 1;

    req.body.codigo_entrada = nextCodigoEntrada;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementEntrada;