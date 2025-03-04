const ContasBancarias = require('../models/contas_bancarias.model');
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');

// Adicionar uma nova conta ao ContasBancarias
exports.adicionarContaBnacaria = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      conta_bancaria,
      codigo_conta_bancaria,
      status,
      agencia,
      conta
    } = req.body;


    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    if (!conta_bancaria) {
      return res.status(400).json({ error: 'A descricao é obrigatória.' });
    }


    const ContaExistente = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      $or: [
        { conta_bancaria }, // Verifica a descrição
      ],
    });

    if (ContaExistente) {
      if (produtoExistente.conta_bancaria == conta_bancaria) {
        return res.status(409).json({
          error: 'Já existe um item cadastrado com essa descrição.',
        });
      }
    }


    const novaContasBancarias = new ContasBancarias({
      codigo_loja,
      codigo_empresa,
      conta_bancaria,
      codigo_conta_bancaria,
      status,
      agencia,
      conta
    });

    await novaContasBancarias.save();

    res.status(201).json(novaContasBancarias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Listar todas as contas do ContasBancarias
exports.listarContasBancarias = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    const ContaBancaria = await ContasBancarias.find({ codigo_loja, codigo_empresa });

    if (!ContaBancaria) {
      return res.status(404).json({ message: 'ContaBancaria não encontrado para esta loja e empresa' });
    }

    res.status(200).json(ContaBancaria);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar uma conta no ContasBancarias
exports.atualizarContaBancaria = async (req, res) => {

  const {
    codigo_loja,
    codigo_empresa,
  } = req.body;

  try {

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.' });
    }

    const updatedProduto = await ContasBancarias.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    if (!updatedProduto) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    await updatedProduto.save();
    res.status(200).json(updatedProduto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Excluir uma conta do ContasBancarias
exports.excluirContaBancaria = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      tipo_conta,
      codigo_pai
    } = req.body;

    const ContasBancarias = await ContasBancarias.findOne({ codigo_loja, codigo_empresa });

    if (!ContasBancarias) {
      return res.status(404).json({ message: 'ContasBancarias não encontrado para esta loja e empresa' });
    }

    let conta;
    switch (tipo_conta) {
      case 'receitas_operacional':
        conta = ContasBancarias.receitas_operacional.id(codigo_pai);
        break;
      case 'deducoes':
        conta = ContasBancarias.deducoes.id(codigo_pai);
        break;
      case 'custo':
        conta = ContasBancarias.custo.id(codigo_pai);
        break;
      case 'despesas_operacionais':
        conta = ContasBancarias.despesas_operacionais.id(codigo_pai);
        break;
      case 'outras_dispesas_receitas':
        conta = ContasBancarias.outras_dispesas_receitas.id(codigo_pai);
        break;
      default:
        return res.status(400).json({ message: 'Tipo de conta inválido' });
    }

    if (!conta) {
      return res.status(404).json({ message: 'Conta não encontrada' });
    }

    conta.remove();

    await ContasBancarias.save();
    res.status(200).json(ContasBancarias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listarContaBancaria = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      console.error('Faltando codigo_loja ou codigo_empresa');
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    const ContasBancarias = await ContasBancarias.findOne({ codigo_loja, codigo_empresa });

    if (!ContasBancarias) {
      console.error('ContasBancarias não encontrado');
      return res.status(404).json({
        error: 'ContasBancarias não encontrado.',
      });
    }

    const templatePath = path.join(__dirname, '../views/ContasBancarias.ejs');
    const html = await ejs.renderFile(templatePath, { ContasBancarias });

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

    res.setHeader('Content-Disposition', 'attachment; filename=ContasBancarias.pdf');
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: error.message });
  }
};