const Produto = require("../models/produtos.model");
const Grupos = require("../models/grupos.model");
const Lojas = require("../models/ladingPage.model"); // <-- importe o model que contém os dados das lojas

exports.getProdutos = async (req, res) => {
  try {
    const {
      page,
      limit,
      searchTerm,
      searchType,
      grupo,
      sort,
      url,
    } = req.query;

    // 1️⃣ Verifica se veio a URL
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

    // Extrai os códigos da loja encontrada
    const codigo_loja = lojaDoc.codigo_loja;
    const codigo_empresa = lojaDoc.codigo_empresa;

    // 3️⃣ Paginação
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    // 4️⃣ Filtros base
    let filtros = { codigo_loja, codigo_empresa };

    // 5️⃣ Filtro por grupo
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

    // 6️⃣ Filtro por busca
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
            filtros[searchType] = !isNaN(termoBusca)
              ? parseInt(termoBusca, 10)
              : -1;
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

    // 7️⃣ Ordenação
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

    // 8️⃣ Pipeline de agregação
    const pipeline = [
      { $match: filtros },
      { $sort: sortOptions },
      { $skip: skip },
      { $limit: limitNumber },
      {
        $addFields: {
          grupoIdConvertido: {
            $convert: {
              input: "$grupo",
              to: "int",
              onError: null,
              onNull: null,
            },
          },
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

    // 9️⃣ Execução
    const produtos = await Produto.aggregate(pipeline);
    const totalProdutos = await Produto.countDocuments(filtros);

    // 🔟 Retorno
    res.status(200).json({
      loja: lojaDoc.company_name,
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

