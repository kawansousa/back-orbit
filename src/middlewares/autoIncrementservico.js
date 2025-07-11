const Servicos = require("../models/servicos.model");

async function autoIncrementServicos(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios" });
    }

    // Buscar o último código do Servico para a combinação de loja e empresa
    const lastServico = await Servicos.findOne({
      codigo_loja,
      codigo_empresa,
    }).sort({ codigo_servico: -1 });

    // Definir o próximo código de Servico
    const nextCodigoServico = lastServico ? lastServico.codigo_servico + 1 : 1;

    // Adicionar o código de Servico ao corpo da requisição
    req.body.codigo_servico = nextCodigoServico;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementServicos;
