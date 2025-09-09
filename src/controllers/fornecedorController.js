const Fornecedor = require('../models/fornecedores.model');

exports.createFornecedor = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_fornecedor,
      razao_social,
      nome_fantasia,
      cnpj,
      ie,
      fone,
      fone_secundario,
      email,
      endereco,
    } = req.body;


    // Verificar se codigo_loja e codigo_empresa estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    if (!razao_social && !razao_social) {
      return res.status(400).json({ error: 'A razão social ou fantasia são obrigatórios.' });
    }

    if (!cnpj && !cpf) {
      return res.status(400).json({ error: 'É necessário informar CNPJ ou CPF.' });
    }

    const fornecedorExistente = await Fornecedor.findOne({
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
            { ie: { $ne: "nao informado" } },
            { ie: { $ne: "" } },
            { ie },
          ],
        }
      ],
    });

    if (fornecedorExistente) {
      if (fornecedorExistente.cnpj === cnpj) {
        return res.status(409).json({
          error: "Já existe um cliente cadastrado com esse  CNPJ.",
        });
      } else if (fornecedorExistente.ie === ie) {
        return res.status(409).json({
          error: "Já existe um cliente cadastrado com esse IE.",
        });
      }
    }

    // Validar formato de email
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Formato de email inválido.' });
    }

    const novoFornecedor = new Fornecedor({
      codigo_loja,
      codigo_empresa,
      codigo_fornecedor,
      razao_social,
      nome_fantasia,
      cnpj,
      ie,
      fone,
      fone_secundario,
      email,
      endereco,
    });

    await novoFornecedor.save();
    res.status(201).json({
      message: 'Fornecedor criado com sucesso',
      cliente: novoFornecedor,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getFornecedores = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      page = 1,
      limit = 100,
      searchTerm = "",
      searchType = "todos"
    } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber < 1 || limitNumber < 1 || isNaN(pageNumber) || isNaN(limitNumber)) {
      return res.status(400).json({ error: 'Os valores de page e limit devem ser números positivos válidos.' });
    }

    const skip = (pageNumber - 1) * limitNumber;

    let filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm && searchTerm.trim() !== "") {
      const termoBusca = searchTerm.trim();

      if (searchType === 'todos') {
        const conditions = [];

        conditions.push({ nome_fantasia: { $regex: termoBusca, $options: 'i' } });
        
        conditions.push({ razao_social: { $regex: termoBusca, $options: 'i' } });
        
        conditions.push({ email: { $regex: termoBusca, $options: 'i' } });
        
        const cnpjLimpo = termoBusca.replace(/[^\d]/g, '');
        if (cnpjLimpo.length > 0) {
          const regexCnpj = cnpjLimpo.replace(/(\d)/g, '$1[./-]?');
          conditions.push({ cnpj: { $regex: regexCnpj, $options: 'i' } });
        }

        filtros.$or = conditions;
        
      } else {
        switch (searchType) {
          case 'cnpj':
            const cnpjLimpo = termoBusca.replace(/[^\d]/g, '');
            if (cnpjLimpo.length > 0) {
              filtros.cnpj = { $regex: cnpjLimpo.replace(/(\d)/g, '$1[./-]?'), $options: 'i' };
            } else {
              filtros.cnpj = null;
            }
            break;
          case 'nome_fantasia':
          case 'email':
          case 'razao_social':
            filtros[searchType] = { $regex: termoBusca, $options: 'i' };
            break;
          default:
            return res.status(400).json({
              error: "Tipo de busca inválido. Use: todos, cnpj, nome_fantasia, email ou razao_social"
            });
        }
      }
    }

    const fornecedor = await Fornecedor.find(filtros)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    const totalFornecedor = await Fornecedor.countDocuments(filtros);
    const totalPages = Math.ceil(totalFornecedor / limitNumber);

    res.status(200).json({
      data: fornecedor,
      totalPages,
      currentPage: pageNumber,
      totalCount: totalFornecedor,
      hasNextPage: pageNumber < totalPages,
      hasPrevPage: pageNumber > 1,
      message: fornecedor.length === 0 
        ? 'Nenhum fornecedor encontrado para os filtros fornecidos.' 
        : undefined,
    });
    
  } catch (error) {
    console.error("Erro ao buscar fornecedores:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};


// Obter um fornecedor específico
exports.getfornecedorById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query; // Alterado para req.query

    // Verificar se codigo_loja e codigo_empresa estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    const fornecedor = await Fornecedor.findById(req.params.id);
    if (!fornecedor) {
      return res.status(404).json({ error: 'Fornecedor não encontrado' });
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