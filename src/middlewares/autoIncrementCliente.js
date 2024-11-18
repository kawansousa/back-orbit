const Cliente = require('../models/clientes.model');

async function autoIncrementCliente(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código de cliente para a combinação de loja e empresa
    const lastCliente = await Cliente.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_cliente: -1 });

    // Definir o próximo código de cliente
    const nextCodigoCliente = lastCliente ? lastCliente.codigo_cliente + 1 : 1;

    // Adicionar o código de cliente ao corpo da requisição
    req.body.codigo_cliente = nextCodigoCliente;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementCliente;
