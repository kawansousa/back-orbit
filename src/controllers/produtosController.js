// controllers/produtos.controller.js
const Produto = require('../models/produtos.model');
const Grupos = require('../models/grupos.model');
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path')
const Cidade = require('../models/cidades.model');


exports.getProdutos = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      page,
      limit,
      searchTerm,
      searchType,
    } = req.query;

    // Verifica se os parâmetros obrigatórios foram fornecidos
    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ error: "Os campos codigo_loja e codigo_empresa são obrigatórios." });
    }

    // Converte os parâmetros de paginação para números
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber < 1 || limitNumber < 1) {
      return res
        .status(400)
        .json({ error: "Os valores de page e limit devem ser maiores que 0." });
    }

    // Calcula o deslocamento (skip)
    const skip = (pageNumber - 1) * limitNumber;

    // Constrói o objeto de filtros baseado no tipo de busca
    let filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm) {
      if (searchType === "todos") {
        filtros.$or = [
          { descricao: { $regex: searchTerm, $options: "i" } },
          { codigo_produto: isNaN(searchTerm) ? null : parseInt(searchTerm, 10) },
          { codigo_barras: String(searchTerm) }, // Trata codigo_barras como string
          { referencia: { $regex: searchTerm, $options: "i" } },
        ].filter((condition) => condition[Object.keys(condition)[0]] !== null);
      } else {
        // Busca específica por campo
        switch (searchType) {
          case "codigo_produto":
            if (!isNaN(searchTerm)) {
              filtros[searchType] = parseInt(searchTerm, 10);
            }
            break;
          case "codigo_barras":
            filtros[searchType] = String(searchTerm); // Trata codigo_barras como string
            break;
          case "descricao":
          case "referencia":
            filtros[searchType] = { $regex: searchTerm, $options: "i" };
            break;
        }
      }
    }

    // Pipeline de agregação para trazer o nome do grupo
    const pipeline = [
      { $match: filtros },
      { $skip: skip },
      { $limit: limitNumber },
      {
        $addFields: {
          grupo: {
            $cond: {
              if: { $and: [{ $ne: ['$grupo', ''] }, { $ne: ['$grupo', null] }] },
              then: { $toInt: '$grupo' },
              else: null,
            },
          },
        },
      },
      {
        $lookup: {
          from: 'grupos', // Nome da coleção no banco
          localField: 'grupo', // Campo no documento atual (Produto)
          foreignField: 'codigo_grupo', // Campo no documento relacionado (Grupos)
          as: 'grupoInfo',
        },
      },
      {
        $addFields: {
          grupo: {
            $cond: {
              if: { $gt: [{ $size: '$grupoInfo' }, 0] },
              then: { $arrayElemAt: ['$grupoInfo.descricao', 0] },
              else: '',
            },
          },
        },
      },
      { $unset: ['grupoInfo'] }, // Remove o campo adicional para limpar o resultado
    ];

    // Consulta com agregação
    const produtos = await Produto.aggregate(pipeline);

    // Total de produtos para a paginação
    const totalProdutos = await Produto.countDocuments(filtros);

    if (produtos.length === 0) {
      return res
        .status(404)
        .json({ message: "Nenhum produto encontrado para os filtros fornecidos." });
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


exports.createProduto = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_produto, // Atribuído no middleware
      codigo_barras,
      codigo_fabricante,
      descricao,
      status,
      grupo,
      subgrupo,
      referencia,
      localizacao,
      vencimento,
      volume,
      precos,
      estoque,
      encargos,
      configuracoes
    } = req.body;

    // Converter codigo_barras para string, se necessário
    const codigoBarrasString = String(codigo_barras);

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
        { codigo_barras: codigoBarrasString }, // Verifica o código de barras como string
      ],
    });

    if (produtoExistente) {
      if (produtoExistente.descricao === descricao) {
        return res.status(409).json({
          error: 'Já existe um item cadastrado com essa descrição.',
        });
      }

      if (produtoExistente.codigo_barras === codigoBarrasString) {
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
      codigo_barras: codigoBarrasString,
      codigo_fabricante,
      descricao,
      status,
      grupo,
      subgrupo,
      volume,
      referencia,
      vencimento,
      localizacao,
      precos,
      estoque,
      encargos,
      configuracoes
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

/* importação */
exports.importProdutosFromExcel = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'uploads', 'tbl_Produtos.xls');

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo Excel não encontrado.' });
    }

    // Lê o arquivo Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Remover a primeira linha (cabeçalho)
    jsonData.shift();

    const produtos = jsonData.map(linha => {
      return {
        codigo_loja: '3',
        codigo_empresa: '1',
        codigo_produto: parseInt(linha[3]),
        codigo_barras: linha[4],
        referencia: parseInt(linha[47]),
        descricao: linha[5],
        precos: [
          {
            preco_compra: parseFloat(linha[21]),
            cma: parseFloat(linha[22]),
            preco_venda: parseFloat(linha[24]),
            preco_atacado: parseFloat(linha[25]),
            ultimos_precos: {
              ultimo_preco_compra: 0,
              ultimo_cma: 0,
              ultimo_preco_venda: 0,
              ultimo_preco_atacada: 0,
            },
          },
        ],
        estoque: [
          {
            estoque: parseInt(linha[15]),
            estoque_deposito: 0,
            estoque_usado: 0,
            unidade: 'UN',
            minimo_estoque: 0,
          },
        ],
        encargos: [
          {
            ncm: parseInt(linha[10]),
            cest: 0,
            icms: 0,
            ipi: 0,
            pis: 0,
            cofins: 0,
          },
        ],
      };
    });

    // Salva os dados em um arquivo JSON
    const jsonFilePath = path.join(__dirname, '..', 'uploads', 'ites.json');
    fs.writeFileSync(jsonFilePath, JSON.stringify(produtos, null, 2), 'utf8');

    res.status(200).json({ message: 'Produtos importados e salvos em ites.json com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.importClientesFromExcel = async (req, res) => {
  try {
    const filePath = path.join(__dirname, '..', 'uploads', 'tbl_Clientes.xls');

    // Verifica se o arquivo existe
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo Excel não encontrado.' });
    }

    // Lê o arquivo Excel
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    jsonData.shift();

    const getCidadeCodigo = async (nomeCidade) => {
      const nomeCidadeMinusculo = nomeCidade.toLowerCase();
      const cidade = await Cidade.findOne({ nome: { $regex: new RegExp(`^${nomeCidadeMinusculo}$`, 'i') } });
      return cidade ? cidade.codigo : null;
    };


    const produtos = await Promise.all(jsonData.map(async (linha) => {
      const nomeCidade = linha[8]; // Ajuste conforme a posição correta
      const codigoCidade = await getCidadeCodigo(nomeCidade);

      return {
        codigo_loja: '3',
        codigo_empresa: '1',
        codigo_cliente: parseInt(linha[2]),
        cpf: parseInt(linha[43]) || 'nao informado',
        rg: parseInt(linha[44]) || 'nao informado',
        nome: linha[3] || '',
        apelido: linha[4] || '',
        cnpj: parseInt(linha[16]) || 'nao informado',
        ie: parseInt(linha[17]) || 'nao informado',
        fone: linha[13],
        fone_secundario: linha[14],
        email: linha[32],
        tipo: linha[1] === 1 ? 'FISICA' : 'JURIDICA',
        endereco: {
          endereco: linha[6],
          numero: linha[10],
          bairro: linha[7],
          cidade: `${codigoCidade}`,
          cep: linha[12]
        },
        conjugue: {
          nome: '',
          apelido: '',
          cpf: '',
          fone: '',
          email: ''
        },
        status: 'ativo',
        data_cadastro: linha[50]

      }
    }));

    // Salva os dados em um arquivo JSON
    const jsonFilePath = path.join(__dirname, '..', 'uploads', 'clientes.json');
    fs.writeFileSync(jsonFilePath, JSON.stringify(produtos, null, 2), 'utf8');

    res.status(200).json({ message: 'Produtos importados e salvos em ites.json com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.syncProdutos = async (req, res) => {
  try {
    const { lastSyncTime, codigo_loja, codigo_empresa, } = req.query;

    console.log(lastSyncTime)
    const syncTime = new Date(lastSyncTime);

    // Log para verificar a data recebida
    console.log('Data de sincronização recebida:', syncTime);

    // Encontre produtos alterados ou adicionados desde a última sincronização
    const produtos = await Produto.find({
      updatedAt: { $gte: syncTime },
      codigo_loja,
      codigo_empresa,
    });

    // Log para verificar quantos produtos foram encontrados
    console.log('Produtos encontrados:', produtos.length);

    res.status(200).json(produtos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}



/* exports.importProdutosFromExcel = async (req, res) => {
  try {
    // Caminhos para os arquivos JSON
    const itesFilePath = path.join(__dirname, '..', 'uploads', 'itens_casadecarne.json');
    const precosFilePath = path.join(__dirname, '..', 'uploads', 'itens_casadecarne_precos.json');
    const estoqueFilePath = path.join(__dirname, '..', 'uploads', 'itens_casadecarne_estoque.json');

    // Verifica se os arquivos existem
    if (!fs.existsSync(itesFilePath) || !fs.existsSync(precosFilePath) || !fs.existsSync(estoqueFilePath)) {
      return res.status(404).json({ error: 'Um ou mais arquivos JSON não foram encontrados.' });
    }

    // Lê os arquivos JSON
    const itesData = JSON.parse(fs.readFileSync(itesFilePath, 'utf8'));
    const precosData = JSON.parse(fs.readFileSync(precosFilePath, 'utf8'));
    const estoqueData = JSON.parse(fs.readFileSync(estoqueFilePath, 'utf8'));

    // Combina os dados em um novo formato
    const itensLoja = itesData.map(item => {
      const precos = precosData.find(p => p.ITEM === item.CODIGO);
      const estoque = estoqueData.find(e => e.ITEM === item.CODIGO);

      return {
        codigo_loja: '4',
        codigo_empresa: '1',
        codigo_produto: item.CODIGO,
        codigo_barras: item.COD_BARRA,
        referencia: item.REFERENCIA || '',
        descricao: item.DESCRICAO,
        precos: [
          {
            preco_compra: parseFloat(precos.PRE_COMPRA.replace('R$ ', '').replace(',', '.')),
            cma: parseFloat(precos.PRE_CMA?.replace('R$ ', '').replace(',', '.') || '0'),
            preco_venda: parseFloat(precos.PRE_VENDA.replace('R$ ', '').replace(',', '.')),
            preco_atacado: parseFloat(precos.PRE_ATACADO.replace('R$ ', '').replace(',', '.')),
            ultimos_precos: {
              ultimo_preco_compra: 0,
              ultimo_cma: 0,
              ultimo_preco_venda: 0,
              ultimo_preco_atacada: 0,
            },
          },
        ],
        estoque: [
          {
            estoque: parseFloat(estoque.ESTOQUE_ATUAL.replace('.', '')),
            estoque_deposito: 0,
            estoque_usado: parseFloat(estoque.ESTOQUE_USADO.replace('.', '') || '0'),
            unidade: 'UN',
            minimo_estoque: parseFloat(estoque.ESTOQUE_MIN.replace('.', '') || '0'),
          },
        ],
        encargos: [
          {
            ncm: parseInt(item.NCM || '0'),
            cest: item.CEST || 0,
            icms: 0,
            ipi: 0,
            pis: 0,
            cofins: 0,
          },
        ],
      };
    });

    // Salva os dados em um novo arquivo JSON
    const itensLojaFilePath = path.join(__dirname, '..', 'uploads', 'itens_loja.json');
    fs.writeFileSync(itensLojaFilePath, JSON.stringify(itensLoja, null, 2), 'utf8');

    res.status(200).json({ message: 'Itens gerados e salvos em itens_loja.json com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}; */