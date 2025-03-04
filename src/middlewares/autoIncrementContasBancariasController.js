const ContasBancarias = require('../models/contas_bancarias.model');

async function autoIncrementContasBancariasController(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código de ContasBancarias para a combinação de loja e empresa
    const lastContasBancarias = await ContasBancarias.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_conta_bancaria: -1 });

    // Definir o próximo código de ContasBancarias
    const nextCodigoContasBancarias = lastContasBancarias ? lastContasBancarias.codigo_conta_bancaria + 1 : 1;

    // Adicionar o código de ContasBancarias ao corpo da requisição
    req.body.codigo_conta_bancaria = nextCodigoContasBancarias;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementContasBancariasController;
