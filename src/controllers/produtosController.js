// controllers/produtos.controller.js
const Produto = require('../models/produtos.model');

exports.createProduto = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.body;

    // Verificar se codigo_loja e codigo_empresa estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ 
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' 
      });
    }

    // Criar um novo produto com os dados fornecidos
    const newProduto = new Produto(req.body);
    await newProduto.save();

    res.status(201).json({ 
      message: 'Produto criado com sucesso', 
      produto: newProduto 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Listar todos os produtos
// Listar todos os produtos por codigo_loja e codigo_empresa usando req.body
exports.getProdutos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.body;

    // Validação para garantir que os parâmetros foram fornecidos
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    // Procurar produtos com base nos filtros fornecidos
    const produtos = await Produto.find({ codigo_loja, codigo_empresa });

    // Verificar se existem produtos encontrados
    if (produtos.length === 0) {
      return res.status(404).json({ message: 'Nenhum produto encontrado para essa loja e empresa.' });
    }

    res.status(200).json(produtos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obter produto por ID
exports.getProdutosById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query; // ou req.body, dependendo de onde você quer receber os dados

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
  try {
    const { codigo_loja, codigo_empresa } = req.body; // Ou req.query, dependendo de onde os parâmetros são passados

    // Verificar se os parâmetros obrigatórios estão presentes
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    // Atualizar o produto com base no ID, validando também a loja e empresa
    const updatedProduto = await Produto.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa },  // Filtra pelo ID, codigo_loja e codigo_empresa
      req.body,
      { new: true }  // Retorna o documento atualizado
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