const Produto = require("../models/produtos.model");
const Grupos = require("../models/grupos.model");

exports.getProdutos = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      page,
      limit,
      searchTerm,
      searchType,
      grupo,
      sort,
    } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    let filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (grupo && grupo.trim() !== "") {
      const grupoDoc = await Grupos.findOne({
        descricao: { $regex: new RegExp(`^${grupo}$`, "i") },
      });

      if (grupoDoc) {
        filtros.grupo = String(grupoDoc.codigo_grupo);
      } else {
        return res.status(200).json({
          total: 0,
          page: pageNumber,
          totalPages: 0,
          limit: limitNumber,
          data: [],
        });
      }
    }

    if (searchTerm && searchTerm.trim() !== "") {
      const termoBusca = searchTerm.trim();
      if (searchType === "todos") {
        const conditions = [];
        conditions.push({ descricao: { $regex: termoBusca, $options: "i" } });
        if (!isNaN(termoBusca)) {
          conditions.push({ codigo_produto: parseInt(termoBusca, 10) });
        }
        conditions.push({ codigo_barras: String(termoBusca) });
        conditions.push({ referencia: { $regex: termoBusca, $options: "i" } });
        filtros.$or = conditions;
      } else {
        switch (searchType) {
          case "codigo_produto":
            if (!isNaN(termoBusca)) {
              filtros[searchType] = parseInt(termoBusca, 10);
            } else {
              filtros[searchType] = -1;
            }
            break;
          case "codigo_barras":
            filtros[searchType] = String(termoBusca);
            break;
          case "descricao":
          case "referencia":
            filtros[searchType] = { $regex: termoBusca, $options: "i" };
            break;
        }
      }
    }

    const sortOptions = {};
    if (sort) {
      if (sort.startsWith("-")) {
        sortOptions[sort.substring(1)] = -1;
      } else {
        sortOptions[sort] = 1;
      }
    } else {
      sortOptions["descricao"] = 1;
    }

    const pipeline = [
      { $match: filtros },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limitNumber },
      {
        $addFields: {
          grupoIdConvertido: { $toInt: "$grupo" },
        },
      },
      {
        $lookup: {
          from: "grupos",
          localField: "grupoIdConvertido",
          foreignField: "codigo_grupo",
          as: "grupoInfo",
        },
      },
      {
        $addFields: {
          grupo: {
            $cond: {
              if: { $gt: [{ $size: "$grupoInfo" }, 0] },
              then: { $arrayElemAt: ["$grupoInfo.descricao", 0] },
              else: "Sem grupo",
            },
          },
        },
      },
      { $unset: ["grupoInfo", "grupoIdConvertido"] },
    ];

    const produtos = await Produto.aggregate(pipeline);
    const totalProdutos = await Produto.countDocuments(filtros);

    res.status(200).json({
      total: totalProdutos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalProdutos / limitNumber),
      data: produtos,
    });
  } catch (error) {
    console.error("Erro na busca de produtos:", error);
    res.status(500).json({ error: error.message });
  }
};
