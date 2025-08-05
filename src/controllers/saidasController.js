const Saida = require('../models/saidas.model');
const Produto = require('../models/produtos.model');

exports.createSaida = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_saida,
      saida,
      itens,
    } = req.body;

    if (
      !codigo_loja || !codigo_empresa || !codigo_saida || !saida ||
      !itens
    ) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    const newSaida = new Saida({
      codigo_loja,
      codigo_empresa,
      codigo_saida,
      saida,
      itens,
      status: 'ativo'
    });

    for (const item of itens) {
      const produto = await Produto.findOne({
        codigo_produto: item.codigo_produto,
        codigo_loja,
        codigo_empresa,
      });

      if (produto) {
        const quantidadeSaida = Number(item.quantidade) || 0;
        if (produto.estoque[0].estoque < quantidadeSaida) {
          return res.status(400).json({
            error: `Estoque insuficiente para o produto ${item.codigo_produto}.`,
          });
        }
        produto.estoque[0].estoque -= quantidadeSaida;
        await produto.save();
      }
    }

    await newSaida.save();
    res.status(201).json(newSaida);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSaidas = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      page = 1,
      limit = 100,
      searchTerm = '',
      searchType = 'todos'
    } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let searchFilter = { codigo_loja, codigo_empresa };

    if (searchTerm && searchTerm.trim() !== '') {
      const searchRegex = new RegExp(searchTerm.trim(), 'i');

      switch (searchType) {
        case 'codigo':
          searchFilter.codigo_saida = searchRegex;
          break;
        case 'descricao':
          searchFilter['itens.descricao'] = searchRegex;
          break;
        case 'todos':
        default:
          searchFilter.$or = [
            { codigo_saida: searchRegex },
            { 'itens.descricao': searchRegex },
            { saida: searchRegex }
          ];
          break;
      }
    }

    const saidas = await Saida.find(searchFilter)
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const totalCount = await Saida.countDocuments(searchFilter);
    const totalPages = Math.ceil(totalCount / limitNum);

    if (saidas.length === 0) {
      return res.status(404).json({
        message: 'Nenhum saida encontrado para os filtros fornecidos.',
        data: [],
        totalPages: 0,
        currentPage: pageNum,
        totalCount: 0
      });
    }

    res.status(200).json({
      data: saidas,
      totalPages,
      currentPage: pageNum,
      totalCount,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSaidaById = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_loja, codigo_empresa } = req.query;

    const saida = await Saida.findOne({
      _id: id,
      codigo_loja,
      codigo_empresa
    });

    if (!saida) {
      return res.status(404).json({ error: 'Saída não encontrada' });
    }

    res.status(200).json(saida);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSaida = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_loja, codigo_empresa } = req.query;
    const updateData = req.body;

    const saida = await Saida.findOneAndUpdate(
      { _id: id, codigo_loja, codigo_empresa },
      updateData,
      { new: true, runValidators: true }
    );

    if (!saida) {
      return res.status(404).json({ error: 'Saída não encontrada' });
    }

    res.status(200).json(saida);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
