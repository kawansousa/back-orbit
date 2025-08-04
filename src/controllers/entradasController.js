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
          lucro_venda: item.precos.lucro_venda,
          lucro_atacado: item.precos.lucro_atacado,
          ultimos_precos: {
            ultimo_preco_compra: produto.precos[0]?.preco_compra || 0,
            ultimo_cma: produto.precos[0]?.cma || 0,
            ultimo_preco_venda: produto.precos[0]?.preco_venda || 0,
            ultimo_preco_atacado: produto.precos[0]?.preco_atacado || 0,
            ultimo_lucro_venda: produto.precos[0]?.lucro_venda || 0,
            ultimo_lucro_atacado: produto.precos[0]?.lucro_atacado || 0,
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

    const entrada = await Entrada.findOne({ _id: id, codigo_loja, codigo_empresa })
      .populate('fornecedor', 'razao_social nome_fantasia');

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
    const {
      codigo_loja,
      codigo_empresa,
      fornecedor,
      numero_nota_fiscal,
      itens,
      forma_pagamento,
      encargos
    } = req.body;

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

    const entradaAntiga = await Entrada.findOne({ _id: id, codigo_loja, codigo_empresa });

    if (!entradaAntiga) {
      return res.status(404).json({ error: 'Entrada não encontrada para essa loja e empresa.' });
    }

    const updateData = {
      fornecedor,
      numero_nota_fiscal,
      itens,
      forma_pagamento,
      encargos,
      updated_at: new Date()
    };

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedEntrada = await Entrada.findOneAndUpdate(
      { _id: id, codigo_loja, codigo_empresa },
      updateData,
      { new: true, runValidators: true }
    ).populate('fornecedor', 'razao_social nome_fantasia');

    if (itens && Array.isArray(itens)) {
      for (const itemAntigo of entradaAntiga.itens) {
        const produto = await Produto.findOne({
          codigo_produto: itemAntigo.codigo_produto,
          codigo_loja,
          codigo_empresa,
        });

        if (produto) {
          const quantidadeAnterior = Number(itemAntigo.quantidade) || 0;
          produto.estoque[0].estoque -= quantidadeAnterior;
          await produto.save();
        }
      }

      for (const item of itens) {
        const produto = await Produto.findOne({
          codigo_produto: item.codigo_produto,
          codigo_loja,
          codigo_empresa,
        });

        if (produto) {
          const quantidadeNova = Number(item.quantidade) || 0;
          produto.estoque[0].estoque += quantidadeNova;

          produto.precos = [{
            preco_compra: item.precos.preco_compra,
            cma: item.precos.cma,
            preco_venda: item.precos.preco_venda,
            preco_atacado: item.precos.preco_atacado,
            lucro_venda: item.precos.lucro_venda,
            lucro_atacado: item.precos.lucro_atacado,
            ultimos_precos: {
              ultimo_preco_compra: produto.precos[0]?.preco_compra || 0,
              ultimo_cma: produto.precos[0]?.cma || 0,
              ultimo_preco_venda: produto.precos[0]?.preco_venda || 0,
              ultimo_preco_atacado: produto.precos[0]?.preco_atacado || 0,
              ultimo_lucro_venda: produto.precos[0]?.lucro_venda || 0,
              ultimo_lucro_atacado: produto.precos[0]?.lucro_atacado || 0,
            },
          }];

          if (encargos) {
            produto.encargos = [{
              ncm: item.ncm || produto.encargos[0]?.ncm,
              cest: encargos.cest || produto.encargos[0]?.cest || 0,
              icms: encargos.icms || produto.encargos[0]?.icms || 0,
              ipi: encargos.ipi || produto.encargos[0]?.ipi || 0,
              pis: encargos.pis || produto.encargos[0]?.pis || 0,
              cofins: encargos.cofins || produto.encargos[0]?.cofins || 0,
            }];
          }

          await produto.save();
        }
      }
    }

    res.status(200).json({
      message: 'Entrada atualizada com sucesso',
      entrada: updatedEntrada
    });
  } catch (error) {
    console.error('Erro ao atualizar entrada:', error);
    res.status(500).json({ error: error.message });
  }
};
