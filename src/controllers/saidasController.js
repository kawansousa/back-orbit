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
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    const saidas = await Saida.find({ codigo_loja, codigo_empresa });
    res.status(200).json(saidas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSaidaById = async (req, res) => {
  try {
    const { id } = req.params;

    const saida = await Saida.findById(id);
    if (!saida) {
      return res.status(404).json({ error: 'Saída não encontrada' });
    }

    res.status(200).json(saida);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

