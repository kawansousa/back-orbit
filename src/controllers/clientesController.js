const Cliente = require("../models/clientes.model");
const Cidades = require("../models/cidades.model");

exports.getClientes = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      page = 1,
      limit = 100,
      searchTerm = "",
      searchType = "todos",
    } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (
      pageNumber < 1 ||
      limitNumber < 1 ||
      isNaN(pageNumber) ||
      isNaN(limitNumber)
    ) {
      return res.status(400).json({
        error:
          "Os valores de page e limit devem ser números positivos válidos.",
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    let filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm && searchTerm.trim() !== "") {
      const termoBusca = searchTerm.trim();
      const numeroLimpo = termoBusca.replace(/[^\d]/g, ""); // remove pontos, traços e barras

      // Função auxiliar para criar condições de CPF/CNPJ
      const gerarCondicoesCpfCnpj = (campo, numero) => {
        const condicoes = [];

        // Busca sem formatação
        condicoes.push({ [campo]: { $regex: numero, $options: "i" } });

        // Busca formatada com regex flexível (aceita ., / e - opcionais)
        condicoes.push({
          [campo]: {
            $regex: numero.split("").join("[.\\/-]?"),
            $options: "i",
          },
        });

        // Caso o campo esteja salvo como número (sem string)
        condicoes.push({
          $expr: {
            $regexMatch: {
              input: { $toString: `$${campo}` },
              regex: numero,
              options: "i",
            },
          },
        });

        return condicoes;
      };

      const conditions = [];

      switch (searchType) {
        case "nome":
        case "email":
          filtros[searchType] = { $regex: termoBusca, $options: "i" };
          break;

        case "cpf":
          if (numeroLimpo.length >= 11) {
            filtros.$or = gerarCondicoesCpfCnpj("cpf", numeroLimpo);
          }
          break;

        case "cnpj":
          if (numeroLimpo.length >= 11) {
            filtros.$or = gerarCondicoesCpfCnpj("cnpj", numeroLimpo);
          }
          break;

        case "todos":
        default:
          conditions.push({ nome: { $regex: termoBusca, $options: "i" } });
          conditions.push({ email: { $regex: termoBusca, $options: "i" } });

          if (numeroLimpo.length > 0) {
            conditions.push(...gerarCondicoesCpfCnpj("cpf", numeroLimpo));
            conditions.push(...gerarCondicoesCpfCnpj("cnpj", numeroLimpo));
          }

          filtros.$or = conditions;
          break;
      }
    }

    // --- PIPELINE ---
    const pipeline = [
      { $match: filtros },
      { $sort: { updatedAt: -1 } },
      { $skip: skip },
      { $limit: limitNumber },

      // Corrige tipo de cidade se for número
      {
        $addFields: {
          "endereco.cidade": {
            $cond: {
              if: { $regexMatch: { input: "$endereco.cidade", regex: /^[0-9]+$/ } },
              then: { $toInt: "$endereco.cidade" },
              else: "$endereco.cidade",
            },
          },
          "conjugue.endereco.cidade": {
            $cond: {
              if: { $regexMatch: { input: "$conjugue.endereco.cidade", regex: /^[0-9]+$/ } },
              then: { $toInt: "$conjugue.endereco.cidade" },
              else: "$conjugue.endereco.cidade",
            },
          },
        },
      },

      // Faz lookup da cidade principal
      {
        $lookup: {
          from: "cidades",
          let: { cidadeId: "$endereco.cidade" },
          pipeline: [
            { $match: { $expr: { $eq: ["$codigo", "$$cidadeId"] } } },
          ],
          as: "cidadeInfo",
        },
      },
      {
        $addFields: {
          "endereco.cidade": {
            $cond: {
              if: { $gt: [{ $size: "$cidadeInfo" }, 0] },
              then: { $arrayElemAt: ["$cidadeInfo.nome", 0] },
              else: "$endereco.cidade",
            },
          },
        },
      },

      // Faz lookup da cidade do conjugue
      {
        $lookup: {
          from: "cidades",
          let: { cidadeId: "$conjugue.endereco.cidade" },
          pipeline: [
            { $match: { $expr: { $eq: ["$codigo", "$$cidadeId"] } } },
          ],
          as: "cidadeInfoConjugue",
        },
      },
      {
        $addFields: {
          "conjugue.endereco.cidade": {
            $cond: {
              if: { $gt: [{ $size: "$cidadeInfoConjugue" }, 0] },
              then: { $arrayElemAt: ["$cidadeInfoConjugue.nome", 0] },
              else: "$conjugue.endereco.cidade",
            },
          },
        },
      },
      { $unset: ["cidadeInfo", "cidadeInfoConjugue"] },
    ];

    const clientes = await Cliente.aggregate(pipeline);
    const totalClientes = await Cliente.countDocuments(filtros);
    const totalPages = Math.ceil(totalClientes / limitNumber);

    res.status(200).json({
      data: clientes,
      totalPages,
      currentPage: pageNumber,
      totalCount: totalClientes,
      hasNextPage: pageNumber < totalPages,
      hasPrevPage: pageNumber > 1,
      message:
        clientes.length === 0
          ? "Nenhum cliente encontrado para os filtros fornecidos."
          : undefined,
    });
  } catch (error) {
    console.error("Erro ao buscar clientes:", error.message, error.stack);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};


exports.createCliente = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_cliente,
      nome,
      apelido,
      cpf,
      cnpj,
      ie,
      rg,
      fone,
      fone_secundario,
      email,
      tipo,
      endereco,
      conjugue,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    // Verificar duplicidade
    const clienteExistente = await Cliente.findOne({
      codigo_loja,
      codigo_empresa,
      $or: [
        {
          $and: [
            { cnpj: { $ne: "nao informado" } },
            { cnpj: { $ne: "" } },
            { cnpj },
          ],
        },
        {
          $and: [
            { cpf: { $ne: "nao informado" } },
            { cpf: { $ne: "" } },
            { cpf },
          ],
        },
        {
          $and: [{ ie: { $ne: "nao informado" } }, { ie: { $ne: "" } }, { ie }],
        },
        {
          $and: [{ rg: { $ne: "nao informado" } }, { rg: { $ne: "" } }, { rg }],
        },
      ],
    });

    if (clienteExistente) {
      if (clienteExistente.cpf === cpf || clienteExistente.cnpj === cnpj) {
        return res.status(409).json({
          error: "Já existe um cliente cadastrado com esse CPF ou CNPJ.",
        });
      } else if (clienteExistente.rg === rg || clienteExistente.ie === ie) {
        return res.status(409).json({
          error: "Já existe um cliente cadastrado com esse RG ou IE.",
        });
      }
    }
    // Validar formato de email
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: "Formato de email inválido." });
    }

    const novoCliente = new Cliente({
      codigo_loja,
      codigo_empresa,
      codigo_cliente,
      nome,
      apelido,
      cpf,
      cnpj,
      ie,
      rg,
      fone,
      fone_secundario,
      email,
      tipo,
      endereco,
      conjugue,
    });

    await novoCliente.save();

    res.status(201).json({
      message: "Cliente criado com sucesso",
      cliente: novoCliente,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getClientesById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    // Find client by ID, validating store and company
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    // Check if client was found
    if (!cliente) {
      return res.status(404).json({
        error: "Cliente não encontrado para essa loja e empresa.",
      });
    }

    // Find the city based on the city code in the client's address
    const cidade = await Cidades.findOne({
      codigo: parseInt(cliente.endereco.cidade, 10),
    });

    if (cidade) {
      cliente.endereco.cidade = cidade.nome;
    }

    // Return found client with city name
    res.status(200).json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCliente = async (req, res) => {
  const { codigo_loja, codigo_empresa, nome } = req.body;

  try {
    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    // Validate name if present
    if (nome !== undefined && nome.trim() === "") {
      return res.status(400).json({ error: "Preencha o nome" });
    }

    // Update client, validating store and company
    const updatedCliente = await Cliente.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    // Check if client was found and updated
    if (!updatedCliente) {
      return res.status(404).json({
        error: "Cliente não encontrado para essa loja e empresa.",
      });
    }

    // Return updated client
    res.status(200).json({
      message: "Cliente atualizado",
      cliente: updatedCliente,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }
    res.status(200).json({ message: "Cliente removido com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
