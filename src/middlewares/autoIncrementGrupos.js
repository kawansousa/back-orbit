const Grupos = require('../models/grupos.model');

async function autoIncrementGrupos(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    // Buscar o último código do Grupo para a combinação de loja e empresa
    const lastGrupo= await Grupos.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_grupo: -1 });

    // Definir o próximo código de Grupo
    const nextCodigoGrupo = lastGrupo ? lastGrupo.codigo_grupo + 1 : 1;

    // Adicionar o código de Grupo ao corpo da requisição
    req.body.codigo_grupo = nextCodigoGrupo;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementGrupos;
