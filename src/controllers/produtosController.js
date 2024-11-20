// controllers/produtos.controller.js
const Produto = require('../models/produtos.model');

exports.createProduto = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_produto, // Atribuído no middleware
      codigo_barras,
      descricao,
      grupo,
      subgrupo,
      referencia,
      vencimento,
      precos,
      estoque,
    } = req.body;


    console.log(
      codigo_loja,
      codigo_empresa,
      codigo_produto, // Atribuído no middleware
      codigo_barras,
      descricao,
      grupo,
      subgrupo,
      referencia,
      vencimento,
      precos,
      estoque,)


    // Verificar se os campos obrigatórios estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    if (!descricao) {
      return res.status(400).json({ error: 'A descricao é obrigatória.' });
    }

    // Verificar duplicidade (descrição ou código de barras)
    const produtoExistente = await Produto.findOne({
      codigo_loja,
      codigo_empresa,
      $or: [
        { descricao }, // Verifica a descrição
        { codigo_barras }, // Verifica o código de barras
      ],
    });

    if (produtoExistente) {
      if (produtoExistente.descricao == descricao) {
        return res.status(409).json({
          error: 'Já existe um item cadastrado com essa descrição.',
        });
      }

      if (produtoExistente.codigo_barras == codigo_barras) {
        return res.status(409).json({
          error: 'Já existe um item cadastrado com esse código de barras.',
        });
      }
    }

    // Criar um novo produto com os dados fornecidos
    const newProduto = new Produto({
      codigo_loja,
      codigo_empresa,
      codigo_produto, // Valor já atribuído pelo middleware
      codigo_barras,
      descricao,
      grupo,
      subgrupo,
      referencia,
      vencimento,
      precos,
      estoque,
    });

    await newProduto.save();

    res.status(201).json({
      message: 'Produto criado com sucesso',
      produto: newProduto,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.getProdutos = async (req, res) => {
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
          { descricao: { $regex: searchTerm, $options: 'i' } },
          { codigo_produto: isNaN(searchTerm) ? null : parseInt(searchTerm, 10) },
          { codigo_barras: isNaN(searchTerm) ? null : parseInt(searchTerm, 10) },
          { referencia: { $regex: searchTerm, $options: 'i' } }
        ].filter(condition => condition[Object.keys(condition)[0]] !== null);
      } else {
        // Busca específica por campo
        switch (searchType) {
          case 'codigo_produto':
          case 'codigo_barras':
            if (!isNaN(searchTerm)) {
              filtros[searchType] = parseInt(searchTerm, 10);
            }
            break;
          case 'descricao':
          case 'referencia':
            filtros[searchType] = { $regex: searchTerm, $options: 'i' };
            break;
        }
      }
    }

    // Consulta com paginação e filtros
    const produtos = await Produto.find(filtros)
      .skip(skip)
      .limit(limitNumber);

    // Total de produtos para a paginação
    const totalProdutos = await Produto.countDocuments(filtros);

    if (produtos.length === 0) {
      return res.status(404).json({ message: 'Nenhum produto encontrado para os filtros fornecidos.' });
    }

    // Retorna os produtos junto com informações de paginação
    res.status(200).json({
      total: totalProdutos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalProdutos / limitNumber),
      data: produtos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obter produto por ID
exports.getProdutosById = async (req, res) => {
  try {


    // Verificar se os parâmetros obrigatórios estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    // Buscar o produto pelo ID e validar a loja e empresa
    const produto = await Produto.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    // Verificar se o produto foi encontrado
    if (!produto) {
      return res.status(404).json({ error: 'Produto não encontrado para essa loja e empresa.' });
    }

    // Retornar o produto encontrado
    res.status(200).json(produto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProduto = async (req, res) => {
  const { codigo_loja, codigo_empresa, descricao } = req.body;

  try {
    // Verificar se os parâmetros obrigatórios estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    // Verificar se a descrição é válida (não vazia, caso esteja no corpo da requisição)
    if (descricao !== undefined && descricao.trim() === '') {
      return res.status(400).json({ error: 'Preencha a descrição' });
    }

    // Atualizar o produto com base no ID, validando também a loja e empresa
    const updatedProduto = await Produto.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa }, // Filtra pelo ID, codigo_loja e codigo_empresa
      req.body,
      { new: true } // Retorna o documento atualizado
    );

    // Verificar se o produto foi encontrado e atualizado
    if (!updatedProduto) {
      return res.status(404).json({ error: 'Produto não encontrado para essa loja e empresa.' });
    }

    // Retornar o produto atualizado
    res.status(200).json({ message: 'Produto atualizado', produto: updatedProduto });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};