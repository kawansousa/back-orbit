const Servicos = require("../models/servicos.model");

exports.listaServicos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit } = req.query;

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

    const filtros = {
      codigo_loja,
      codigo_empresa,
    };

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
    const updatedServicos = await Servicos.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    // Check if client was found and updated
    if (!updatedServicos) {
      return res.status(404).json({
        error: "Servicos não encontrado para essa loja e empresa.",
      });
    }

    // Return updated client
    res.status(200).json({
      message: "Servicos atualizado",
      Servicos: updatedServicos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteServico = async (req, res) => {
  try {
    const Servicos = await Servicos.findByIdAndDelete(req.params.id);
    if (!Servicos) {
      return res.status(404).json({ error: "Servicos não encontrado" });
    }
    res.status(200).json({ message: "Servicos removido com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
