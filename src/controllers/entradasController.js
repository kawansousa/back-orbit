const Entrada = require('../models/entradas.model');
const Produto = require('../models/produtos.model');

exports.createEntrada = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_entrada,
      entrada,
      forma_pagamento,
      status,
      xml,
      fornecedor,
      itens,
      encargos,
    } = req.body;

    // Validação de campos obrigatórios
    if (
      !codigo_loja || !codigo_empresa || !codigo_entrada || !entrada ||
      !fornecedor || !itens || !forma_pagamento
    ) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    if (!Array.isArray(forma_pagamento) || forma_pagamento.length === 0) {
      return res.status(400).json({ error: 'forma_pagamento deve ser um array não vazio.' });
    }

    for (const pagamento of forma_pagamento) {
      if (!pagamento.meio_pagamento || !pagamento.valor_pagamento) {
        return res.status(400).json({
          error: 'Cada forma de pagamento deve conter meio_pagamento e valor_pagamento.',
        });
      }
    }

    // Criar nova entrada
    const newEntrada = new Entrada({
      codigo_loja,
      codigo_empresa,
      codigo_entrada,
      entrada,
      forma_pagamento,
      status,
      xml,
      fornecedor,
      itens,
      encargos,
    });

    // Atualizar estoque e dados dos produtos
    for (const item of itens) {
      const produto = await Produto.findOne({
        codigo_produto: item.codigo_produto,
        codigo_loja,
        codigo_empresa,
      });

      if (produto) {
        const quantidadeEntrada = Number(item.quantidade) || 0;
        produto.estoque[0].estoque += quantidadeEntrada;

        produto.precos = [{
          preco_compra: item.precos.preco_compra,
          cma: item.precos.cma,
          preco_venda: item.precos.preco_venda,
          preco_atacado: item.precos.preco_atacado,
          ultimos_precos: {
            ultimo_preco_compra: produto.precos[0]?.preco_compra || 0,
            ultimo_cma: produto.precos[0]?.cma || 0,
            ultimo_preco_venda: produto.precos[0]?.preco_venda || 0,
            ultimo_preco_atacado: produto.precos[0]?.preco_atacado || 0,
          },
        }];

        produto.encargos = [{
          ncm: item.ncm,
          cest: encargos?.cest || 0,
          icms: encargos?.icms || 0,
          ipi: encargos?.ipi || 0,
          pis: encargos?.pis || 0,
          cofins: encargos?.cofins || 0,
        }];

        await produto.save();
      }
    }

    await newEntrada.save();

    res.status(201).json({
      message: 'Entrada criada com sucesso',
      entrada: newEntrada,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEntradas = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'codigo_loja e codigo_empresa são obrigatórios.' });
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;

    const filtros = { codigo_loja, codigo_empresa };

    const entradas = await Entrada.find(filtros)
      .populate('fornecedor', 'razao_social nome_fantasia')
      .skip(skip)
      .limit(limitNumber);

    const totalEntradas = await Entrada.countDocuments(filtros);

    if (entradas.length === 0) {
      return res.status(404).json({ message: 'Nenhuma entrada encontrada para os filtros fornecidos.' });
    }

    res.status(200).json({
      total: totalEntradas,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalEntradas / limitNumber),
      data: entradas,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getEntradaById = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'codigo_loja e codigo_empresa são obrigatórios.' });
    }

    const entrada = await Entrada.findOne({ _id: id, codigo_loja, codigo_empresa });

    if (!entrada) {
      return res.status(404).json({ error: 'Entrada não encontrada para essa loja e empresa.' });
    }

    res.status(200).json(entrada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEntrada = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_loja, codigo_empresa } = req.query;
    const { itens, forma_pagamento } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'codigo_loja e codigo_empresa são obrigatórios.' });
    }

    if (forma_pagamento && Array.isArray(forma_pagamento)) {
      for (const pagamento of forma_pagamento) {
        if (!pagamento.meio_pagamento || !pagamento.valor_pagamento) {
          return res.status(400).json({
            error: 'Cada forma de pagamento deve conter meio_pagamento e valor_pagamento.',
          });
        }
      }
    }

    const updatedEntrada = await Entrada.findOneAndUpdate(
      { _id: id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    if (!updatedEntrada) {
      return res.status(404).json({ error: 'Entrada não encontrada para essa loja e empresa.' });
    }

    // Atualização de estoque (caso seja necessário com novos itens)
    if (itens) {
      for (const item of itens) {
        const produto = await Produto.findOne({
          codigo_produto: item.codigo_produto,
          codigo_loja,
          codigo_empresa,
        });

        if (produto) {
          produto.estoque[0].estoque += Number(item.quantidade) || 0;
          await produto.save();
        }
      }
    }

    res.status(200).json({ message: 'Entrada atualizada', entrada: updatedEntrada });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
