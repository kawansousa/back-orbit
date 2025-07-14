const Mecanico = require("../models/mecanico.model");

async function autoIncrementMecanico(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios" });
    }

    // Buscar o último código do Servico para a combinação de loja e empresa
    const lastMecanico = await Mecanico.findOne({
      codigo_loja,
      codigo_empresa,
    }).sort({ codigo_mecanico: -1 });

    // Definir o próximo código de Mecânico
    const nextCodigoMecanico = lastMecanico
      ? lastMecanico.codigo_mecanico + 1
      : 1;

    // Adicionar o código de Mecânico ao corpo da requisição
    req.body.codigo_mecanico = nextCodigoMecanico;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementMecanico;
