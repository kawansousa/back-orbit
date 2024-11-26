const Receber = require('../models/receber.model');

async function autoIncrementreceber(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja, parcelas } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do Receber para a combinação de loja e empresa
    const lastReceber = await Receber.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_receber: -1 });

    // Definir o próximo código de Receber inicial
    let nextCodigoReceber = lastReceber ? lastReceber.codigo_receber + 1 : 1;

    // Adicionar o código de Receber a cada parcela
    if (parcelas && Array.isArray(parcelas)) {
      req.body.parcelas = parcelas.map((parcela, index) => ({
        ...parcela,
        codigo_receber: nextCodigoReceber + index
      }));
    }

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementreceber;
