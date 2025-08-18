const Grupos = require('../models/grupos.model');

async function autoIncrementGrupos(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    const lastGrupo= await Grupos.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_grupo: -1 });

    const nextCodigoGrupo = lastGrupo ? lastGrupo.codigo_grupo + 1 : 1;

    req.body.codigo_grupo = nextCodigoGrupo;

    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementGrupos;
