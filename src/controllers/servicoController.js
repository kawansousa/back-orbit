const Servicos = require("../models/servicos.model");
exports.listaServicos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit, searchTerm, searchType } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
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

    // Filtros obrigatórios
    const filtros = {
      codigo_loja,
      codigo_empresa,
    };

    // Adiciona filtro de busca com base no searchType e searchTerm
    if (searchTerm) {
      if (searchType === "todos") {
        filtros.$or = [
          { codigo_servico: searchTerm },
          { descricao: { $regex: searchTerm, $options: "i" } },
          { preco: parseFloat(searchTerm) }
        ];
      } else if (searchType === "nome") {
        filtros.codigo_servico = searchTerm;
      } else if (searchType === "descricao") {
        filtros.descricao = { $regex: searchTerm, $options: "i" };
      } else if (searchType === "preco") {
        filtros.preco = parseFloat(searchTerm);
      }
    }

    const servicos = await Servicos.find(filtros).skip(skip).limit(limitNumber);
    const totalServicos = await Servicos.countDocuments(filtros);

    res.status(200).json({
      total: totalServicos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalServicos / limitNumber),
      data: servicos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createServico = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_servico,
      descricao,
      status,
      preco,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const novoServico = new Servicos({
      codigo_loja,
      codigo_empresa,
      codigo_servico,
      descricao,
      status,
      preco: parseInt(preco, 10),
      data_criacao: new Date(),
      data_atualizacao: new Date(),
    });

    await novoServico.save();

    res.status(201).json({
      message: "Servico criado com sucesso",
      Servico: novoServico,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getServicosById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    // Find client by ID, validating store and company
    const Servicos = await Servicos.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    // Check if client was found
    if (!Servicos) {
      return res.status(404).json({
        error: "Servicos não encontrado para essa loja e empresa.",
      });
    }

    // Find the city based on the city code in the client's address
    const cidade = await Cidades.findOne({
      codigo: parseInt(Servicos.endereco.cidade, 10),
    });

    if (cidade) {
      Servicos.endereco.cidade = cidade.nome;
    }

    // Return found client with city name
    res.status(200).json(Servicos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateServico = async (req, res) => {
  const { codigo_loja, codigo_empresa, descricao, preco, status } = req.body;

  try {
    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa || !descricao || !preco) {
      return res.status(400).json({
        error:
          "Os campos codigo_loja, codigo_empresa, descricao e preco são obrigatórios.",
      });
    }

    // Validate descricao and preco
    if (descricao.trim() === "") {
      return res.status(400).json({ error: "Preencha a descrição" });
    }

    if (isNaN(preco) || preco <= 0) {
      return res.status(400).json({ error: "Preço inválido" });
    }

    // Update service, validating store and company
    const updatedServico = await Servicos.findOneAndUpdate(
      { codigo_servico: req.params.id, codigo_loja, codigo_empresa },
      { descricao, preco, status },
      { new: true }
    );

    // Check if service was found and updated
    if (!updatedServico) {
      return res.status(404).json({
        error: "Serviço não encontrado para essa loja e empresa.",
      });
    }

    // Return updated service
    res.status(200).json({
      message: "Serviço atualizado",
      servico: updatedServico,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteServico = async (req, res) => {
  const { codigo_loja, codigo_empresa, codigo_servico } = req.body;

  try {
    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa || !codigo_servico) {
      return res.status(400).json({
        error:
          "Os campos codigo_loja, codigo_empresa e codigo_servico são obrigatórios.",
      });
    }

    // Update service status to "cancelado"
    const updatedServico = await Servicos.findOneAndUpdate(
      { codigo_servico, codigo_loja, codigo_empresa },
      { status: "cancelado" },
      { new: true }
    );

    // Check if service was found and updated
    if (!updatedServico) {
      return res.status(404).json({
        error: "Serviço não encontrado para essa loja e empresa.",
      });
    }

    // Return updated service
    res.status(200).json({
      message: "Status do serviço atualizado para cancelado",
      servico: updatedServico,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
