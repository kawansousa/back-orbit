const Entrada = require('../models/entradas.model');
const Produto = require('../models/produtos.model');

exports.createEntrada = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_entrada,
      entrada,
      status,
      xml,
      fornecedor,
      itens,
      encargos,
    } = req.body;

    // Verificar se os campos obrigatórios estão presentes
    if (!codigo_loja || !codigo_empresa || !codigo_entrada || !entrada || !fornecedor || !itens) {
      return res.status(400).json({ error: 'Campos obrigatórios ausentes.' });
    }

    // Criar uma nova entrada
    const newEntrada = new Entrada({
      codigo_loja,
      codigo_empresa,
      codigo_entrada,
      entrada,
      status,
      xml,
      fornecedor,
      itens,
      encargos,
    });

    // Atualizar o estoque e os preços dos produtos
    for (const item of itens) {
      const produto = await Produto.findOne({ codigo_produto: item.codigo_produto });
      if (produto) {
        // Atualizar o estoque
        produto.estoque[0].estoque += item.quantidade;

        // Atualizar os preços
        produto.precos = [
          {
            preco_compra: item.precos.preco_compra,
            cma: item.precos.cma,
            preco_venda: item.precos.preco_venda,
            preco_atacado: item.precos.preco_atacado,
            ultimos_precos: {
              ultimo_preco_compra: produto.precos[0].preco_compra,
              ultimo_cma: produto.precos[0].cma,
              ultimo_preco_venda: produto.precos[0].preco_venda,
              ultimo_preco_atacado: produto.precos[0].preco_atacado,
            },
          },
        ];

        // Atualizar os encargos
        produto.encargos = [
          {
            ncm: item.ncm,
            cest: encargos.cest,
            icms: encargos.icms,
            ipi: encargos.ipi,
            pis: encargos.pis,
            cofins: encargos.cofins,
          },
        ];

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

    // Verifica se os parâmetros obrigatórios foram fornecidos
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    // Converte os parâmetros de paginação para números
    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    // Calcula o deslocamento (skip)
    const skip = (pageNumber - 1) * limitNumber;

    // Filtros de busca
    const filtros = { codigo_loja, codigo_empresa };

    // Consulta com paginação
    const entradas = await Entrada.find(filtros).skip(skip).limit(limitNumber);
    const totalEntradas = await Entrada.countDocuments(filtros);

    if (entradas.length === 0) {
      return res.status(404).json({ message: 'Nenhuma entrada encontrada para os filtros fornecidos.' });
    }

    // Retorna as entradas junto com informações de paginação
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

    // Verifica se os parâmetros obrigatórios foram fornecidos
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    // Buscar a entrada pelo ID e validar a loja e empresa
    const entrada = await Entrada.findOne({ _id: id, codigo_loja, codigo_empresa });

    // Verificar se a entrada foi encontrada
    if (!entrada) {
      return res.status(404).json({ error: 'Entrada não encontrada para essa loja e empresa.' });
    }

    // Retornar a entrada encontrada
    res.status(200).json(entrada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEntrada = async (req, res) => {
  try {
    const { id } = req.params;
    const { codigo_loja, codigo_empresa } = req.query;
    const { itens } = req.body;

    // Verifica se os parâmetros obrigatórios foram fornecidos
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    // Atualizar a entrada com base no ID, validando também a loja e empresa
    const updatedEntrada = await Entrada.findOneAndUpdate(
      { _id: id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    // Verificar se a entrada foi encontrada e atualizada
    if (!updatedEntrada) {
      return res.status(404).json({ error: 'Entrada não encontrada para essa loja e empresa.' });
    }

    // Atualizar o estoque dos produtos
    for (const item of itens) {
      const produto = await Produto.findOne({ codigo_produto: item.codigo_produto });
      if (produto) {
        produto.estoque.estoque += item.quantidade;
        await produto.save();
      }
    }

    // Retornar a entrada atualizada
    res.status(200).json({ message: 'Entrada atualizada', entrada: updatedEntrada });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
