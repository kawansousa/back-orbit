const Pagar = require('../models/pagar.model');

async function autoIncrementPagar(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja, parcelas } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    const lastPagar = await Pagar.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_pagar: -1 }); 

    let nextCodigoPagar = lastPagar ? lastPagar.codigo_pagar + 1 : 1;

    if (parcelas && Array.isArray(parcelas)) {
      req.body.parcelas = parcelas.map((parcela, index) => ({
        ...parcela,
        codigo_pagar: nextCodigoPagar + index 
      }));
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementPagar;
