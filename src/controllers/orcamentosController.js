const Orcamento = require('../models/orcamentos.model');
const Cliente = require('../models/clientes.model'); // Assumindo que existe um modelo de Cliente
const ejs = require('ejs');
const path = require('path');
const puppeteer = require('puppeteer');
const chromium = require('chrome-aws-lambda');
const Loja = require('../models/lojas.model');



exports.createOrcamento = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_orcamento,
      cliente,
      cliente_sem_cadastro,
      vendedor,
      itens,
      observacoes,
      valores,
    } = req.body;

    // Validações básicas
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    if (!cliente && !cliente_sem_cadastro) {
      return res.status(400).json({
        error: 'É necessário informar um cliente cadastrado ou dados do cliente sem cadastro.',
      });
    }

    if (!itens || itens.length === 0) {
      return res.status(400).json({
        error: 'O orçamento deve conter pelo menos um item.',
      });
    }

    // Verifica se o cliente existe (se for um cliente cadastrado)
    if (cliente) {
      const clienteExiste = await Cliente.findById(cliente);
      if (!clienteExiste) {
        return res.status(404).json({
          error: 'Cliente não encontrado.',
        });
      }
    }


    const novoOrcamento = new Orcamento({
      codigo_loja,
      codigo_empresa,
      codigo_orcamento,
      cliente,
      cliente_sem_cadastro,
      vendedor,
      itens,
      observacoes,
      valores,
      historico: [{
        status_anterior: null,
        status_novo: 'aberto',
        usuario: vendedor
      }]
    });

    await novoOrcamento.save();

    res.status(201).json({
      message: 'Orçamento criado com sucesso',
      orcamento: novoOrcamento,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrcamentos = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      status,
      cliente,
      vendedor,
      data_inicial,
      data_final,
      page,
      limit
    } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        error: 'Os valores de page e limit devem ser maiores que 0.',
      });
    }

    const skip = (pageNumber - 1) * limitNumber;
    let filtros = { codigo_loja, codigo_empresa };

    if (status) filtros.status = status;
    if (cliente) filtros.cliente = cliente;
    if (vendedor) filtros.vendedor = vendedor;
    if (data_inicial || data_final) {
      filtros.data_emissao = {};
      if (data_inicial) filtros.data_emissao.$gte = new Date(data_inicial);
      if (data_final) filtros.data_emissao.$lte = new Date(data_final);
    }

    const orcamentos = await Orcamento.find(filtros)
      .populate('cliente', 'nome cpf')
      .skip(skip)
      .limit(limitNumber)
      .sort({ data_emissao: -1 });

    const totalOrcamentos = await Orcamento.countDocuments(filtros);

    if (orcamentos.length === 0) {
      return res.status(404).json({
        message: 'Nenhum orçamento encontrado para os filtros fornecidos.',
      });
    }

    res.status(200).json({
      total: totalOrcamentos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalOrcamentos / limitNumber),
      data: orcamentos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getOrcamentoById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    }).populate('cliente', 'nome cpf');

    if (!orcamento) {
      return res.status(404).json({
        error: 'Orçamento não encontrado.'
      });
    }

    res.status(200).json(orcamento);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOrcamento = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_orcamento,
      cliente,
      cliente_sem_cadastro,
      vendedor,
      itens,
      observacoes,
      valores,
      status, // Adicionado explicitamente para verificar mudanças de status
    } = req.body;
    const usuario = req.body.usuario || 'Sistema'; // Idealmente viria do token de autenticação

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    if (!cliente && !cliente_sem_cadastro) {
      return res.status(400).json({
        error: 'É necessário informar um cliente cadastrado ou dados do cliente sem cadastro.',
      });
    }

    if (!itens || itens.length === 0) {
      return res.status(400).json({
        error: 'O orçamento deve conter pelo menos um item.',
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
      codigo_orcamento,
    });

    if (!orcamento) {
      return res.status(404).json({
        error: 'Orçamento não encontrado.'
      });
    }

    if (orcamento.status !== 'aberto') {
      return res.status(400).json({
        error: 'Apenas orçamentos abertos podem ser alterados.'
      });
    }

    // Atualiza os itens e recalcula os valores se houver novos itens
    if (itens) {
      const itensCalculados = itens.map(item => {
        const subtotal_unitario = item.preco_unitario * item.quantidade;
        const desconto = (subtotal_unitario * (item.desconto_percentual || 0)) / 100 + (item.desconto_valor || 0);
        const total_unitario = subtotal_unitario - desconto;

        return {
          ...item,
          subtotal_unitario,
          total_unitario
        };
      });

      const subtotal = itensCalculados.reduce((acc, item) => acc + item.subtotal_unitario, 0);
      const desconto_total = itensCalculados.reduce((acc, item) =>
        acc + ((item.desconto_percentual || 0) * item.subtotal_unitario / 100) + (item.desconto_valor || 0), 0);
      const total = subtotal - desconto_total;

      orcamento.itens = itensCalculados;

    }

    // Atualiza os outros campos recebidos
    if (cliente !== undefined) orcamento.cliente = cliente;
    if (cliente_sem_cadastro !== undefined) orcamento.cliente_sem_cadastro = cliente_sem_cadastro;
    if (vendedor !== undefined) orcamento.vendedor = vendedor;

    if (status && status !== orcamento.status) {
      orcamento.historico.push({
        status_anterior: orcamento.status,
        status_novo: status,
        usuario
      });
      orcamento.status = status;
    }

    if (observacoes !== undefined) {
      orcamento.observacoes = observacoes;
    }

    if (valores !== undefined) {
      orcamento.valores = valores;
    }
    await orcamento.save();

    res.status(200).json({
      message: 'Orçamento atualizado com sucesso',
      orcamento
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


exports.deleteOrcamento = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    if (!orcamento) {
      return res.status(404).json({
        error: 'Orçamento não encontrado.'
      });
    }

    if (orcamento.status !== 'aberto') {
      return res.status(400).json({
        error: 'Apenas orçamentos abertos podem ser excluídos.'
      });
    }

    await orcamento.deleteOne();

    res.status(200).json({
      message: 'Orçamento excluído com sucesso'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.cancelarOrcamento = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;
    const usuario = req.body.usuario || 'Sistema'; // Idealmente viria do token de autenticação

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    if (!orcamento) {
      return res.status(404).json({
        error: 'Orçamento não encontrado.'
      });
    }

    if (orcamento.status !== 'aberto') {
      return res.status(400).json({
        error: 'Apenas orçamentos abertos podem ser cancelados.'
      });
    }



    orcamento.status = 'cancelado';
    orcamento.historico.push({
      status_anterior: 'aberto',
      status_novo: 'cancelado',
      usuario
    });

    await orcamento.save();

    res.status(200).json({
      message: 'Orçamento cancelado com sucesso',
      orcamento
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateOrcamentoPDF = async (req, res) => {

  try {
    console.log('Iniciando geração de PDF');
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      console.error('Faltando codigo_loja ou codigo_empresa');
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }
    
    const loja = await Loja.findOne({
      codigo_loja,
      'empresas.codigo_empresa': codigo_empresa
    });

    if (!loja) {
      console.error('Loja não encontrada');
      return res.status(404).json({
        error: 'Loja não encontrada.',
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    }).populate('cliente', 'nome cpf');

    if (!orcamento) {
      console.error('Orçamento não encontrado');
      return res.status(404).json({
        error: 'Orçamento não encontrado.',
      });
    }

    const empresa = loja.empresas.find(emp => emp.codigo_empresa === parseInt(codigo_empresa));
    const logo = empresa ? empresa.logo : null;
    const rodape = empresa ? empresa.rodape : null;

    console.log('Orçamento encontrado:', orcamento);
    const templatePath = path.join(__dirname, '../views/orcamento.ejs');
    const html = await ejs.renderFile(templatePath, { orcamento, logo, rodape });
    console.log('HTML gerado com sucesso');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      },
      preferCSSPageSize: true
    });

    console.log('PDF gerado com sucesso');

    await browser.close();

    res.setHeader('Content-Disposition', 'attachment; filename=orcamento.pdf');
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: error.message });
  }

}

exports.updateOrcamentoStatus = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, status } = req.body;
    const usuario = req.body.usuario || 'Sistema';

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    if (!status) {
      return res.status(400).json({
        error: 'O campo status é obrigatório.'
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    if (!orcamento) {
      return res.status(404).json({
        error: 'Orçamento não encontrado.'
      });
    }
    if (orcamento.status === 'aberto' && status === 'transformado_pedido') {
      orcamento.historico.push({
        status_anterior: orcamento.status,
        status_novo: status,
        usuario,
        data_alteracao: new Date()
      });
      orcamento.status = status;
      
      await orcamento.save();

      res.status(200).json({
        message: 'Status do orçamento atualizado com sucesso',
        orcamento
      });
    } else {
      return res.status(400).json({
        error: `Não é possível alterar o status de '${orcamento.status}' para '${status}'.`
      });
    }

  } catch (error) {
    console.error('Erro ao atualizar status do orçamento:', error);
    res.status(500).json({ error: error.message });
  }
};
