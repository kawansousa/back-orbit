const Grupos = require("../models/grupos.model");

exports.getGruposAtivos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      console.error("Faltando codigo_loja ou codigo_empresa");
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    if (!page) {
      console.error("Faltando page");
      return res.status(400).json({
        error: "O campo page é obrigatório.",
      });
    }

    if (!limit) {
      console.error("Faltando limit");
      return res.status(400).json({
        error: "O campo limit é obrigatório.",
      });
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        error: "Os valores de page e limit devem ser maiores que 0.",
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    const filtros = {
      codigo_loja,
      codigo_empresa,
      status: "ativo",
    };

    const grupos = await Grupos.find(filtros).skip(skip).limit(limitNumber);
    const totalGrupos = await Grupos.countDocuments(filtros);

    res.status(200).json({
      total: totalGrupos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalGrupos / limitNumber),
      data: grupos,
    });
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    res.status(500).json({
      error: "Erro interno do servidor ao buscar grupos.",
      message: error.message,
    });
  }
};
