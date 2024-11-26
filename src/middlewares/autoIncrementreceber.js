const Receber = require('../models/receber.model');

async function autoIncrementreceber(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do Receber para a combinação de loja e empresa
    const lastReceber = await Receber.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_receber: -1 });

    // Definir o próximo código de Receber
    const nextCodigoReceber = lastReceber ? lastReceber.codigo_receber + 1 : 1;

    // Adicionar o código de Receber ao corpo da requisição
    req.body.codigo_receber = nextCodigoReceber;

    console.log(nextCodigoReceber);

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementreceber;
