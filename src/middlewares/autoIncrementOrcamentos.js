const Orcamento = require('../models/orcamentos.model');

async function autoIncrementOrcamentos(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do Orcamento para a combinação de loja e empresa
    const lastOrcamento= await Orcamento.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_orcamento: -1 });

    // Definir o próximo código de Orcamento
    const nextCodigoOrcamento = lastOrcamento ? lastOrcamento.codigo_orcamento + 1 : 1;
    
    // Adicionar o código de Orcamento ao corpo da requisição
    req.body.codigo_orcamento = nextCodigoOrcamento;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementOrcamentos;
