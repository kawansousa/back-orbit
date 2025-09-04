    const Os = require("../models/os.model");

async function autoIncrementOs(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios" });
    }

    // Buscar o último código do OS para a combinação de loja e empresa
    const lastOs = await Os.findOne({
      codigo_loja,
      codigo_empresa,
    }).sort({ codigo_os: -1 });

    // Definir o próximo código de OS
    const nextCodigoOs = lastOs ? lastOs.codigo_os + 1 : 1;

    // Adicionar o código de OS ao corpo da requisição
    req.body.codigo_os = nextCodigoOs;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementOs;
