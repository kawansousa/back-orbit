const Produto = require('../models/produtos.model');

async function autoIncrementProduto(req, res, next) {
  try {
    const { codigo_loja, codigo_empresa } = req.body;

    // Validar se os campos estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código de produto para a loja e empresa
    const lastProduct = await Produto.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_produto: -1 });

    // Definir o próximo código
    const nextCodigoProduto = lastProduct ? lastProduct.codigo_produto + 1 : 1;

    // Gerar o código de barras automaticamente se não for passado
    const codigoBarras =
      req.body.codigo_barras || `${codigo_loja}${codigo_empresa}${String(nextCodigoProduto).padStart(12, '0')}`;

    // Adicionar os códigos no request body
    req.body.codigo_produto = nextCodigoProduto;
    req.body.codigo_barras = codigoBarras;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementProduto;
