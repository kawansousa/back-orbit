const Mecanico = require("../models/mecanico.model");

exports.listaMecanicos = async (req, res) => {
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

    // Adiciona filtro de busca se searchTerm existir
    if (searchTerm) {
      if (searchType === 'todos') {
        filtros.$or = [
          { nome: { $regex: searchTerm, $options: 'i' } },
          { especialidade: { $regex: searchTerm, $options: 'i' } },
          { telefone: { $regex: searchTerm, $options: 'i' } },
        ];
      } else {
        filtros[searchType] = { $regex: searchTerm, $options: 'i' };
      }
    }

    const mecanicos = await Mecanico.find(filtros)
      .skip(skip)
      .limit(limitNumber);

    const totalMecanicos = await Mecanico.countDocuments(filtros);

    res.status(200).json({
      total: totalMecanicos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalMecanicos / limitNumber),
      data: mecanicos,
    });
  } catch (error) {
    console.error("Erro ao listar mecânicos:", error); // Log para capturar erros
    res.status(500).json({ error: error.message });
  }
};



exports.createMecanico = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      nome,
      especialidade,
      telefone,
      comissao,
      status,
      codigo_mecanico,
    } = req.body;

    if (!codigo_loja || !codigo_empresa || !nome) {
      return res.status(400).json({
        error: "Os campos codigo_loja, codigo_empresa e nome são obrigatórios.",
      });
    }

    const novoMecanico = new Mecanico({
      codigo_loja,
      codigo_empresa,
      codigo_mecanico,
      nome,
      comissao,
      especialidade,
      telefone,
      status: status || "ativo",
      data_criacao: new Date(),
      data_atualizacao: new Date(),
    });

    await novoMecanico.save();

    res.status(201).json({
      message: "Mecânico criado com sucesso",
      mecanico: novoMecanico,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMecanicosById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    // Find client by ID, validating store and company
    const Mecanico = await Mecanico.findOne({
      codigo_mecanico: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    // Check if client was found
    if (!Mecanico) {
      return res.status(404).json({
        error: "Mecanico não encontrado para essa loja e empresa.",
      });
    }

    res.status(200).json(Mecanico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMecanico = async (req, res) => {
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
    const updatedServico = await Mecanico.findOneAndUpdate(
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

exports.deleteMecanico = async (req, res) => {
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
    const updatedServico = await Mecanico.findOneAndUpdate(
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
