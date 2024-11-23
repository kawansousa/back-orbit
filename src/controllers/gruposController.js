const Grupos = require('../models/grupos.model');

exports.createGrupos = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_grupo,
      descricao
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    const grupoExistente = await Grupos.findOne({
      codigo_loja,
      codigo_empresa,
      $or: [
        { descricao }, // Verifica a descrição
      ],
    });


    if (grupoExistente) {
      return res.status(409).json({
        error: 'Já existe um Grupo cadastrado com essa descrição.',
      });
    }

    const novoGrupo = new Grupos({
      codigo_loja,
      codigo_empresa,
      codigo_grupo,
      descricao
    });

    await novoGrupo.save();

    res.status(201).json({
      message: 'Grupo criado com sucesso',
      grupo: novoGrupo,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.getGrupos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, descricao, codigo, page, limit } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    const pageNumber = parseInt(page, 10) || 1; // Default para página 1
    const limitNumber = parseInt(limit, 10) || 10; // Default para limite 10


    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        error: 'Os valores de page e limit devem ser maiores que 0.',
      });
    }

    // Calcula o deslocamento (skip)
    const skip = (pageNumber - 1) * limitNumber;

    // Constrói o objeto de filtros
    let filtros = {}; // Garante que o objeto de filtros existe

    if (descricao) {
      filtros.descricao = { $regex: descricao, $options: 'i' }; // Filtro por descricao da cidade
    }

    if (codigo) {
      filtros.codigo = codigo; // Filtro por código da cidade
    }

    // Consulta com paginação e filtros
    const cidades = await Grupos.find(filtros).skip(skip).limit(limitNumber);

    // Total de registros para paginação
    const totalCidades = await Grupos.countDocuments(filtros);

    if (cidades.length === 0) {
      return res.status(404).json({
        message: 'Nenhumm grupo encontrada para os filtros fornecidos.',
      });
    }

    // Retorna os resultados com informações de paginação
    res.status(200).json({
      total: totalCidades,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalCidades / limitNumber),
      data: cidades,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getGrupoById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    // Find client by ID, validating store and company
    const grupo = await Grupos.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    // Check if client was found
    if (!grupo) {
      return res.status(404).json({
        error: 'Cliente não encontrado para essa loja e empresa.'
      });
    }

    // Return found client
    res.status(200).json(grupo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateGrupo = async (req, res) => {
  const { codigo_loja, codigo_empresa, descricao } = req.body;

  try {
    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    // Validate name if present
    if (descricao !== undefined && descricao.trim() === '') {
      return res.status(400).json({ error: 'Preencha o descricao' });
    }

    // Update client, validating store and company
    const updatedGrupo = await Grupos.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    // Check if client was found and updated
    if (!updatedGrupo) {
      return res.status(404).json({
        error: 'Grupo não encontrado para essa loja e empresa.'
      });
    }

    // Return updated client
    res.status(200).json({
      message: 'Grupo atualizado',
      cliente: updatedGrupo
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteGrupo = async (req, res) => {
  try {
    const grupo = await Grupos.findByIdAndDelete(req.params.id);
    if (!grupo) {
      return res.status(404).json({ error: 'grupo não encontrado' });
    }
    res.status(200).json({ message: 'grupo removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};