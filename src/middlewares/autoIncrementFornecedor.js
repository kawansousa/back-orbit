const Fornecedor = require('../models/fornecedores.model');

async function autoIncrementFornecedor(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do fornecedor para a combinação de loja e empresa
    const lastFornecedor = await Fornecedor.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_fornecedor: -1 });

    // Definir o próximo código de Fornecedor
    const nextCodigoFornecedor = lastFornecedor ? lastFornecedor.codigo_fornecedor + 1 : 1;

    // Adicionar o código de Fornecedor ao corpo da requisição
    req.body.codigo_fornecedor = nextCodigoFornecedor;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementFornecedor;
