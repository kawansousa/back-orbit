const Fornecedor = require('../models/fornecedores.model');

exports.createFornecedor = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.body;

    // Verificar se codigo_loja e codigo_empresa estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    // Validações específicas
    if (!razao && !fantasia) {
      return res.status(400).json({ error: 'A razão social ou fantasia são obrigatórios.' });
    }

    if (!cnpj && !cpf) {
      return res.status(400).json({ error: 'É necessário informar CNPJ ou CPF.' });
    }

    // Verificar se já existe fornecedor com mesmo CNPJ/CPF
    const fornecedorExistente = await Fornecedor.findOne({
      codigo_loja,
      codigo_empresa,
      $or: [
        { cnpj: cnpj || null },
        { cpf: cpf || null }
      ]
    });

    if (fornecedorExistente) {
      return res.status(409).json({
        error: 'Já existe um fornecedor cadastrado com este CNPJ/CPF.'
      });
    }

    // Validar formato de email
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Formato de email inválido.' });
    }

    const novoFornecedor = new Fornecedor({
      codigo_loja,
      codigo_empresa,
      cnpj,
      cpf,
      fantasia,
      razao,
      email,
      data_cadastro: new Date(),
      status: true
    });

    await novoFornecedor.save();
    res.status(201).json(novoFornecedor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obter todos os fornecedor
exports.getnovoFornecedores = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      page,
      limit,
      searchTerm,
      searchType // New parameter for specific field search
    } = req.query;

    // Verifica se os parâmetros obrigatórios foram fornecidos
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    // Converte os parâmetros de paginação para números
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({ error: 'Os valores de page e limit devem ser maiores que 0.' });
    }

    // Calcula o deslocamento (skip)
    const skip = (pageNumber - 1) * limitNumber;

    // Constrói o objeto de filtros baseado no tipo de busca
    let filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm) {
      if (searchType === 'todos') {
        filtros.$or = [
          { razao: { $regex: searchTerm, $options: 'i' } },
          { fantasia: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { cnpj: isNaN(searchTerm) ? null : parseInt(searchTerm, 10) },
          { cpf: isNaN(searchTerm) ? null : parseInt(searchTerm, 10) },
        ].filter(condition => condition[Object.keys(condition)[0]] !== null);
      } else {
        // Busca específica por campo
        switch (searchType) {
          case 'cnpj':
          case 'cpf':
            if (!isNaN(searchTerm)) {
              filtros[searchType] = parseInt(searchTerm, 10);
            }
            break;
          case 'fantasia':
          case 'email':
          case 'razao':
            filtros[searchType] = { $regex: searchTerm, $options: 'i' };
            break;
        }
      }
    }

    // Consulta com paginação e filtros
    const fornecedor = await Fornecedor.find(filtros)
      .skip(skip)
      .limit(limitNumber);

    // Total de produtos para a paginação
    const totalFornecedor = await Fornecedor.countDocuments(filtros);

    if (produtos.length === 0) {
      return res.status(404).json({ message: 'Nenhum fornecedor encontrado para os filtros fornecidos.' });
    }

    // Retorna os produtos junto com informações de paginação
    res.status(200).json({
      total: totalFornecedor,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalFornecedor / limitNumber),
      data: fornecedor,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// Obter um fornecedor específico
exports.getfornecedorById = async (req, res) => {
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

// Atualizar um fornecedor
exports.updateFornecedor = async (req, res) => {
  try {

    const { codigo_loja, codigo_empresa } = req.body;

    // Verificar se codigo_loja e codigo_empresa estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }
    const fornecedor = await Fornecedor.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!fornecedor) {
      return res.status(404).json({ error: 'fornecedor não encontrado' });
    }
    res.status(200).json(fornecedor);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Deletar um fornecedor
exports.deleteFornecedor = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.body;

    // Verificar se codigo_loja e codigo_empresa estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    const fornecedor = await Fornecedor.findByIdAndDelete(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ error: 'fornecedor não encontrado' });
    }
    res.status(200).json({ message: 'fornecedor removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};