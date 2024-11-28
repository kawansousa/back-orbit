const Venda = require('../models/vendas.model');

async function autoIncrementVendass(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do Vendas para a combinação de loja e empresa
    const lastVendas= await Venda.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_venda: -1 });

    // Definir o próximo código de Vendas
    const nextCodigoVendas = lastVendas ? lastVendas.codigo_venda + 1 : 1;

    // Adicionar o código de Vendas ao corpo da requisição
    req.body.codigo_venda = nextCodigoVendas;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementVendass;
