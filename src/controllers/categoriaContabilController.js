const DRE = require('../models/categoria_contabil');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

// Adicionar uma nova conta ao DRE
exports.adicionarConta = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      tipo_conta,
      codigo_pai,
      descricao,
      filhos
    } = req.body;

    const dre = await DRE.findOne({ codigo_loja, codigo_empresa });

    if (!dre) {
      return res.status(404).json({ message: 'DRE não encontrado para esta loja e empresa' });
    }

    const novaConta = {
      codigo_pai,
      descricao,
      filhos
    };

    switch (tipo_conta) {
      case 'receitas_operacional':
        dre.receitas_operacional.push(novaConta);
        break;
      case 'deducoes':
        dre.deducoes.push(novaConta);
        break;
      case 'custo':
        dre.custo.push(novaConta);
        break;
      case 'despesas_operacionais':
        dre.despesas_operacionais.push(novaConta);
        break;
      case 'outras_dispesas_receitas':
        dre.outras_dispesas_receitas.push(novaConta);
        break;
      default:
        return res.status(400).json({ message: 'Tipo de conta inválido' });
    }

    await dre.save();
    res.status(201).json(dre);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Listar todas as contas do DRE
exports.listarContas = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    const dre = await DRE.findOne({ codigo_loja, codigo_empresa });

    if (!dre) {
      return res.status(404).json({ message: 'DRE não encontrado para esta loja e empresa' });
    }

    res.status(200).json(dre);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar uma conta no DRE
exports.atualizarConta = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      tipo_conta,
      codigo_pai,
      novaDescricao,
      novosFilhos
    } = req.body;

    const dre = await DRE.findOne({ codigo_loja, codigo_empresa });

    if (!dre) {
      return res.status(404).json({ message: 'DRE não encontrado para esta loja e empresa' });
    }

    let conta;
    switch (tipo_conta) {
      case 'receitas_operacional':
        conta = dre.receitas_operacional.id(codigo_pai);
        break;
      case 'deducoes':
        conta = dre.deducoes.id(codigo_pai);
        break;
      case 'custo':
        conta = dre.custo.id(codigo_pai);
        break;
      case 'despesas_operacionais':
        conta = dre.despesas_operacionais.id(codigo_pai);
        break;
      case 'outras_dispesas_receitas':
        conta = dre.outras_dispesas_receitas.id(codigo_pai);
        break;
      default:
        return res.status(400).json({ message: 'Tipo de conta inválido' });
    }

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    conta.descricao = novaDescricao;
    conta.filhos = novosFilhos;

    await dre.save();
    res.status(200).json(dre);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Excluir uma conta do DRE
exports.excluirConta = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      tipo_conta,
      codigo_pai
    } = req.body;

    const dre = await DRE.findOne({ codigo_loja, codigo_empresa });

    if (!dre) {
      return res.status(404).json({ message: 'DRE não encontrado para esta loja e empresa' });
    }

    let conta;
    switch (tipo_conta) {
      case 'receitas_operacional':
        conta = dre.receitas_operacional.id(codigo_pai);
        break;
      case 'deducoes':
        conta = dre.deducoes.id(codigo_pai);
        break;
      case 'custo':
        conta = dre.custo.id(codigo_pai);
        break;
      case 'despesas_operacionais':
        conta = dre.despesas_operacionais.id(codigo_pai);
        break;
      case 'outras_dispesas_receitas':
        conta = dre.outras_dispesas_receitas.id(codigo_pai);
        break;
      default:
        return res.status(400).json({ message: 'Tipo de conta inválido' });
    }

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    conta.remove();

    await dre.save();
    res.status(200).json(dre);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateDREPDF = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      console.error('Faltando codigo_loja ou codigo_empresa');
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    const dre = await DRE.findOne({ codigo_loja, codigo_empresa });

    if (!dre) {
      console.error('DRE não encontrado');
      return res.status(404).json({
        error: 'DRE não encontrado.',
      });
    }

    const templatePath = path.join(__dirname, '../views/dre.ejs');
    const html = await ejs.renderFile(templatePath, { dre });

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

    await browser.close();

    res.setHeader('Content-Disposition', 'attachment; filename=dre.pdf');
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: error.message });
  }
};