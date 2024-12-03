const Entrada = require('../models/entradas.model');

async function autoIncrementEntrada(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do Entrada para a combinação de loja e empresa
    const lastEntrada = await Entrada.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_entrada: -1 });

    // Definir o próximo código de Entrada
    const nextCodigoEntrada = lastEntrada ? lastEntrada.codigo_entrada + 1 : 1;

    // Adicionar o código de Entrada ao corpo da requisição
    req.body.codigo_entrada = nextCodigoEntrada;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementEntrada;
