const Saida = require("../models/saidas.model");
const Produto = require("../models/produtos.model");

exports.createSaida = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_saida,
      saida,
      responsavel_saida,
      tipo_saida,
      observacoes,
      itens,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios." });
    }

    if (!codigo_saida || !saida) {
      return res
        .status(400)
        .json({ error: "Código da saída e descrição são obrigatórios." });
    }

    if (!responsavel_saida) {
      return res
        .status(400)
        .json({ error: "Responsável pela saída é obrigatório." });
    }

    if (!tipo_saida) {
      return res.status(400).json({ error: "Tipo de saída é obrigatório." });
    }

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        error: "Itens são obrigatórios e devem ser um array não vazio.",
      });
    }

    const tiposPermitidos = [
      "venda",
      "transferencia",
      "perda",
      "devolucao",
      "ajuste",
      "uso_interno",
      "outros",
    ];
    if (!tiposPermitidos.includes(tipo_saida)) {
      return res.status(400).json({
        error: `Tipo de saída inválido. Tipos permitidos: ${tiposPermitidos.join(
          ", "
        )}`,
      });
    }

    const saidaExistente = await Saida.findOne({
      codigo_saida,
      codigo_loja,
      codigo_empresa,
    });

    if (saidaExistente) {
      return res.status(400).json({
        error: `Já existe uma saída com o código ${codigo_saida} para esta loja/empresa.`,
      });
    }

    for (const item of itens) {
      if (!item.codigo_produto || !item.descricao || !item.quantidade) {
        return res.status(400).json({
          error:
            "Todos os itens devem ter código_produto, descrição e quantidade.",
        });
      }

      const quantidadeSaida = Number(item.quantidade);
      if (quantidadeSaida <= 0) {
        return res.status(400).json({
          error: `Quantidade deve ser maior que zero para o produto ${item.codigo_produto}.`,
        });
      }

      const produto = await Produto.findOne({
        codigo_produto: item.codigo_produto,
        codigo_loja,
        codigo_empresa,
      });

      if (!produto) {
        return res.status(400).json({
          error: `Produto ${item.codigo_produto} não encontrado.`,
        });
      }

      if (
        !produto.estoque ||
        !produto.estoque[0] ||
        produto.estoque[0].estoque === undefined
      ) {
        return res.status(400).json({
          error: `Produto ${item.codigo_produto} não possui estoque configurado.`,
        });
      }

      if (produto.estoque[0].estoque < quantidadeSaida) {
        return res.status(400).json({
          error: `Estoque insuficiente para o produto ${item.codigo_produto}. Disponível: ${produto.estoque[0].estoque}, Solicitado: ${quantidadeSaida}`,
        });
      }
    }

    for (const item of itens) {
      const produto = await Produto.findOne({
        codigo_produto: item.codigo_produto,
        codigo_loja,
        codigo_empresa,
      });

      const quantidadeSaida = Number(item.quantidade);
      produto.estoque[0].estoque -= quantidadeSaida;
      await produto.save();
    }

    const newSaida = new Saida({
      codigo_loja,
      codigo_empresa,
      codigo_saida,
      saida,
      responsavel_saida,
      tipo_saida,
      observacoes,
      itens,
    });

    await newSaida.save();
    res.status(201).json({
      message: "Saída criada com sucesso.",
      data: newSaida,
    });
  } catch (error) {
    console.error("Erro ao criar saída:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getSaidas = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      page = 1,
      limit = 100,
      searchTerm = "",
      searchType = "todos",
      status,
    } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios" });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (pageNum < 1 || limitNum < 1 || isNaN(pageNum) || isNaN(limitNum)) {
      return res
        .status(400)
        .json({ error: "Página e limite devem ser números positivos válidos" });
    }

    const skip = (pageNum - 1) * limitNum;

    let searchFilter = { codigo_loja, codigo_empresa };

    if (status && ["pendente", "concluido", "cancelado"].includes(status)) {
      searchFilter.status = status;
    }

    if (searchTerm && searchTerm.trim() !== "") {
      const termoBusca = searchTerm.trim();

      const tiposSaidaMap = {
        venda: "venda",
        transferência: "transferencia",
        transferencia: "transferencia",
        "perda/avaria": "perda",
        perda: "perda",
        avaria: "perda",
        devolução: "devolucao",
        devolucao: "devolucao",
        "ajuste de estoque": "ajuste",
        ajuste: "ajuste",
        "uso interno": "uso_interno",
        uso_interno: "uso_interno",
        outros: "outros",
      };

      if (searchType === "todos") {
        const conditions = [];

        if (!isNaN(termoBusca)) {
          conditions.push({ codigo_saida: parseInt(termoBusca, 10) });
        }

        conditions.push({
          responsavel_saida: { $regex: termoBusca, $options: "i" },
        });

        const tipoMapeado = tiposSaidaMap[termoBusca.toLowerCase()];
        if (tipoMapeado) {
          conditions.push({ tipo_saida: tipoMapeado });
        } else {
          conditions.push({
            tipo_saida: { $regex: termoBusca, $options: "i" },
          });
        }

        searchFilter.$or = conditions;
      } else {
        switch (searchType) {
          case "codigo_saida":
            if (!isNaN(termoBusca)) {
              searchFilter[searchType] = parseInt(termoBusca, 10);
            } else {
              searchFilter[searchType] = -1;
            }
            break;
          case "responsavel_saida":
            searchFilter[searchType] = { $regex: termoBusca, $options: "i" };
            break;
          case "tipo_saida":
            const tipoMapeado = tiposSaidaMap[termoBusca.toLowerCase()];
            if (tipoMapeado) {
              searchFilter[searchType] = tipoMapeado;
            } else {
              searchFilter[searchType] = { $regex: termoBusca, $options: "i" };
            }
            break;
          default:
            return res.status(400).json({
              error:
                "Tipo de busca inválido. Use: todos, codigo_saida, responsavel_saida ou tipo_saida",
            });
        }
      }
    }

    const saidas = await Saida.find(searchFilter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Saida.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      data: saidas,
      totalPages,
      currentPage: pageNum,
      totalCount,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      message:
        saidas.length === 0
          ? "Nenhuma saída encontrada para os filtros fornecidos."
          : undefined,
    });
  } catch (error) {
    console.error("Erro ao buscar saídas:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};

exports.getSaidaById = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios" });
    }

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const saida = await Saida.findOne({
      _id: id,
      codigo_loja,
      codigo_empresa,
    });

    if (!saida) {
      return res.status(404).json({ error: "Saída não encontrada" });
    }

    res.status(200).json({
      data: saida,
      message: "Saída encontrada com sucesso.",
    });
  } catch (error) {
    console.error("Erro ao buscar saída por ID:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateSaida = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_loja,
      codigo_empresa,
      codigo_saida,
      saida,
      responsavel_saida,
      tipo_saida,
      observacoes,
      itens,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ error: "Código da loja e empresa são obrigatórios." });
    }

    if (!codigo_saida || !saida) {
      return res
        .status(400)
        .json({ error: "Código da saída e descrição são obrigatórios." });
    }

    if (!responsavel_saida) {
      return res
        .status(400)
        .json({ error: "Responsável pela saída é obrigatório." });
    }

    if (!tipo_saida) {
      return res.status(400).json({ error: "Tipo de saída é obrigatório." });
    }

    if (!itens || !Array.isArray(itens) || itens.length === 0) {
      return res.status(400).json({
        error: "Itens são obrigatórios e devem ser um array não vazio.",
      });
    }

    const tiposPermitidos = [
      "venda",
      "transferencia",
      "perda",
      "devolucao",
      "ajuste",
      "uso_interno",
      "outros",
    ];
    if (!tiposPermitidos.includes(tipo_saida)) {
      return res.status(400).json({
        error: `Tipo de saída inválido. Tipos permitidos: ${tiposPermitidos.join(
          ", "
        )}`,
      });
    }

    // Busca a saída original
    const saidaOriginal = await Saida.findOne({
      _id: id,
      codigo_loja,
      codigo_empresa,
    });

    if (!saidaOriginal) {
      return res.status(404).json({ error: "Saída não encontrada." });
    }

    // Cancela a saída original: devolve os itens ao estoque
    for (const item of saidaOriginal.itens) {
      const produto = await Produto.findOne({
        codigo_produto: item.codigo_produto,
        codigo_loja,
        codigo_empresa,
      });
      if (produto && produto.estoque && produto.estoque[0]) {
        produto.estoque[0].estoque += Number(item.quantidade);
        await produto.save();
      }
    }

    // Valida e aplica a nova saída
    for (const item of itens) {
      if (!item.codigo_produto || !item.descricao || !item.quantidade) {
        return res.status(400).json({
          error:
            "Todos os itens devem ter código_produto, descrição e quantidade.",
        });
      }

      const quantidadeSaida = Number(item.quantidade);
      if (quantidadeSaida <= 0) {
        return res.status(400).json({
          error: `Quantidade deve ser maior que zero para o produto ${item.codigo_produto}.`,
        });
      }

      const produto = await Produto.findOne({
        codigo_produto: item.codigo_produto,
        codigo_loja,
        codigo_empresa,
      });

      if (!produto) {
        return res.status(400).json({
          error: `Produto ${item.codigo_produto} não encontrado.`,
        });
      }

      if (
        !produto.estoque ||
        !produto.estoque[0] ||
        produto.estoque[0].estoque === undefined
      ) {
        return res.status(400).json({
          error: `Produto ${item.codigo_produto} não possui estoque configurado.`,
        });
      }

      if (produto.estoque[0].estoque < quantidadeSaida) {
        return res.status(400).json({
          error: `Estoque insuficiente para o produto ${item.codigo_produto}. Disponível: ${produto.estoque[0].estoque}, Solicitado: ${quantidadeSaida}`,
        });
      }
    }

    // Debita o estoque dos novos itens
    for (const item of itens) {
      const produto = await Produto.findOne({
        codigo_produto: item.codigo_produto,
        codigo_loja,
        codigo_empresa,
      });

      const quantidadeSaida = Number(item.quantidade);
      produto.estoque[0].estoque -= quantidadeSaida;
      await produto.save();
    }

    // Atualiza a saída
    saidaOriginal.codigo_saida = codigo_saida;
    saidaOriginal.saida = saida;
    saidaOriginal.responsavel_saida = responsavel_saida;
    saidaOriginal.tipo_saida = tipo_saida;
    saidaOriginal.observacoes = observacoes;
    saidaOriginal.itens = itens;
    saidaOriginal.status = "concluido";

    await saidaOriginal.save();

    res.status(200).json({
      message: "Saída atualizada com sucesso.",
      data: saidaOriginal,
    });
  } catch (error) {
    console.error("Erro ao atualizar saída:", error);
    res.status(500).json({ error: error.message });
  }
};
