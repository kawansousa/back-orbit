const Grupos = require("../models/grupos.model");
const Lojas = require("../models/ladingPage.model"); // <-- importe o model que contém os dados das lojas

exports.getGruposAtivos = async (req, res) => {
  try {
    const { page, limit, url, } = req.query;


    if (!url) {
      return res.status(400).json({
        error: "O parâmetro 'url' é obrigatório.",
      });
    }

    // 2️⃣ Busca loja/empresa correspondente
    const lojaDoc = await Lojas.findOne({ url: url.trim().toLowerCase() });

    if (!lojaDoc) {
      return res.status(404).json({
        error: "Loja não encontrada para a URL informada.",
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
      codigo_loja: lojaDoc.codigo_loja,
      codigo_empresa: lojaDoc.codigo_empresa,
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
