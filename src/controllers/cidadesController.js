const Cidades = require('../models/cidades.model');


// Obter todos os fornecedor
exports.getCidades = async (req, res) => {
  try {
    const { page, limit, nome, codigo } = req.query;

    // Converte os parâmetros de paginação para números
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

    if (nome) {
      filtros.nome = { $regex: nome, $options: 'i' }; // Filtro por nome da cidade
    }

    if (codigo) {
      filtros.codigo = codigo; // Filtro por código da cidade
    }

    // Consulta com paginação e filtros
    const cidades = await Cidades.find(filtros).skip(skip).limit(limitNumber);

    // Total de registros para paginação
    const totalCidades = await Cidades.countDocuments(filtros);

    if (cidades.length === 0) {
      return res.status(404).json({
        message: 'Nenhuma cidade encontrada para os filtros fornecidos.',
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

// Obter um fornecedor específico
exports.getCidadesById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.body;

    // Verificar se codigo_loja e codigo_empresa estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ error: 'fornecedor não encontrado' });
    }
    res.status(200).json(fornecedor);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};