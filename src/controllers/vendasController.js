const mongoose = require('mongoose');
const Venda = require('../models/vendas.model');
const Receber = require('../models/receber.model');
const Movimentacao = require('../models/movimentacoes.model');
const Caixa = require('../models/caixa.model');
const Produto = require('../models/produtos.model'); // Import the Produto model
const path = require('path');
const ejs = require('ejs');
const puppeteer = require('puppeteer');


exports.criarVenda = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_venda,
      status,
      cliente,
      cliente_sem_cadastro,
      vendedor,
      tipo,
      observacoes,
      itens,
      forma_pagamento,
      valores,
      historico,
      parcelas,
      codigo_movimento
    } = req.body;

    // Validate required fields
    if (!codigo_loja || !codigo_empresa || !codigo_venda || !vendedor || !itens || !forma_pagamento) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Dados de venda inválidos' });
    }

    // Save sale
    const novaVenda = new Venda({
      codigo_loja,
      codigo_empresa,
      codigo_venda,
      status,
      cliente,
      cliente_sem_cadastro,
      vendedor,
      tipo,
      observacoes,
      itens,
      forma_pagamento,
      valores,
      historico,
      parcelas,
    });

    // Handle cash register and payments
    const caixa = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: 'aberto'
    }).session(session);

    if (!caixa) {
      await session.abortTransaction();
      return res.status(400).json({ message: 'Caixa não está aberto' });
    }

    // Register cash movements for each payment method
    const movimentacoes = [];

    for (const pagamento of forma_pagamento) {
      const movimentacao = new Movimentacao({
        codigo_loja,
        codigo_empresa,
        caixaId: caixa._id,
        codigo_movimento,
        caixa: caixa.caixa,
        codigo_caixa: caixa.codigo_caixa,
        tipo_movimentacao: 'entrada',
        valor: pagamento.valor_pagamento,
        meio_pagamento: pagamento.meio_pagamento,
        documento_origem: novaVenda.codigo_venda,
        origem: 'venda',
        categoria_contabil: 'receita'
      });
      movimentacoes.push(movimentacao.save({ session }));
    }

    const recebimentos = [];

    if (novaVenda.tipo === 'aprazo') {
      for (let i = 0; i < parcelas.length; i++) {
        const { valor_total, data_vencimento, observacao, codigo_receber } = parcelas[i];

        if (!valor_total || valor_total <= 0) {
          await session.abortTransaction();
          return res.status(400).json({ message: `Valor total inválido na parcela ${i + 1}` });
        }

        const novoReceber = new Receber({
          codigo_loja,
          codigo_empresa,
          cliente,
          origem: 'venda',
          documento_origem: novaVenda.codigo_venda,
          valor_total,
          valor_restante: valor_total,
          data_vencimento,
          codigo_receber,
          observacao,
          status: 'aberto',
          fatura: `${i + 1}/${parcelas.length}`
        });

        recebimentos.push(novoReceber.save({ session }));
      }
    }

    // Save movements
    await Promise.all(movimentacoes);
    await caixa.save({ session });

    // Save sale
    await novaVenda.save({ session });

    // Deduct stock for each item in the sale
    for (const item of itens) {
      const produto = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_produto: item.codigo_produto
      }).session(session);

      if (produto) {
        produto.estoque[0].estoque -= item.quantidade;
        await produto.save({ session });
      }
    }

    await session.commitTransaction();

    res.status(201).json(novaVenda);
  } catch (error) {
    await session.abortTransaction();
    console.error(error); // Log the error for debugging
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.cancelarVenda = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { codigo_venda, codigo_loja, codigo_empresa, codigo_movimento } = req.body;

    // Validar se o código da venda foi enviado
    if (!codigo_venda) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Código da venda não fornecido" });
    }

    // Buscar a venda pelo código
    const venda = await Venda.findOne({ codigo_venda, codigo_loja, codigo_empresa }).session(session);
    if (!venda) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Venda não encontrada" });
    }

    // Verificar se a venda já foi cancelada
    if (venda.status === "cancelado") {
      await session.abortTransaction();
      return res.status(400).json({ message: "Venda já foi cancelada" });
    }

    // Reverter o estoque dos itens
    for (const item of venda.itens) {
      const produto = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_produto: item.codigo_produto,
      }).session(session);

      if (produto) {
        produto.estoque[0].estoque += item.quantidade;
        await produto.save({ session });
      }
    }

    // Cancelar contas a receber, se a venda for a prazo
    if (venda.tipo === "aprazo") {
      await Receber.updateMany(
        { documento_origem: venda.codigo_venda, origem: "venda", status: "aberto" },
        { status: "cancelado" },
        { session }
      );
    }

    // Buscar movimentações do caixa associadas à venda
    const movimentacoes = await Movimentacao.find({
      documento_origem: venda.codigo_venda,
      codigo_loja,
      codigo_empresa,
      origem: "venda",
    }).session(session);


    console.log(movimentacoes)

    // Obter o caixa aberto atual
    const caixaAtual = await Caixa.findOne({
      codigo_loja: venda.codigo_loja,
      codigo_empresa: venda.codigo_empresa,
      status: "aberto",
    }).session(session);

    console.log(caixaAtual)

    if (!caixaAtual) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Nenhum caixa aberto encontrado" });
    }

    for (const movimentacao of movimentacoes) {
      if (movimentacao.caixaId.toString() !== caixaAtual._id.toString()) {
        // Criar um novo movimento de cancelamento no caixa aberto
        const novaMovimentacao = new Movimentacao({
          codigo_loja: venda.codigo_loja,
          codigo_empresa: venda.codigo_empresa,
          codigo_movimento,
          caixaId: caixaAtual._id,
          caixa: caixaAtual.caixa,
          codigo_caixa: caixaAtual.codigo_caixa,
          tipo_movimentacao: "saida",
          valor: movimentacao.valor,
          meio_pagamento: movimentacao.meio_pagamento,
          documento_origem: venda.codigo_venda,
          origem: "venda",
          categoria_contabil: "estorno",
          historico: "Cancelamento de venda",
        });

        console.log(novaMovimentacao);

        await novaMovimentacao.save({ session });
      } else {
        // Atualizar a movimentação existente
        movimentacao.tipo_movimentacao = "saida";
        movimentacao.categoria_contabil = "estorno";
        movimentacao.historico = "Cancelamento de venda";
        await movimentacao.save({ session });
      }
    }

    // Atualizar o status da venda para "cancelado"
    venda.status = "cancelado";
    await venda.save({ session });

    // Ajustar o saldo do caixa
    caixaAtual.saldo -= movimentacoes.reduce((total, mov) => total + mov.valor, 0);
    await caixaAtual.save({ session });

    await session.commitTransaction();

    res.status(200).json({ message: "Venda cancelada com sucesso" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};

exports.alterarVenda = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      codigo_venda,
      codigo_loja,
      codigo_empresa,
      cliente,
      vendedor,
      tipo,
      observacoes,
      itens,
      forma_pagamento,
      valores,
      historico,
      parcelas,
      codigo_movimento,
      cliente_sem_cadastro,
    } = req.body;

    // Buscar a venda original
    const venda = await Venda.findOne({ codigo_venda, codigo_loja, codigo_empresa }).session(session);


    if (!venda) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Venda não encontrada" });
    }

    // Verificar se a venda está associada ao mesmo caixa
    const caixaAberto = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: "aberto",
    }).session(session);

    const movimentacoes = await Movimentacao.find({
      documento_origem: venda.codigo_venda,
      codigo_loja,
      codigo_empresa,
      origem: "venda",
    }).session(session);

    console.log(movimentacoes);

    if (!caixaAberto || movimentacoes.codigo_caixa == caixaAberto.codigo_caixa) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Alteração só é permitida no mesmo caixa." });
    }

    // Reverter o estoque dos itens vendidos
    for (const item of venda.itens) {
      const produto = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_produto: item.codigo_produto,
      }).session(session);

      if (produto) {
        produto.estoque[0].estoque += item.quantidade; // Repor o estoque
        await produto.save({ session });
      }
    }

    // Excluir movimentações e contas a receber associadas à venda
    await Movimentacao.deleteMany({
      documento_origem: codigo_venda,
      origem: "venda",
      codigo_loja,
      codigo_empresa,
    }).session(session);

    await Receber.deleteMany({
      documento_origem: codigo_venda,
      origem: "venda",
      codigo_loja,
      codigo_empresa,
    }).session(session);

    // Validar e ajustar o estoque para os novos itens
    for (const item of itens) {
      const produto = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_produto: item.codigo_produto,
      }).session(session);

      if (!produto || produto.estoque[0].estoque < item.quantidade) {
        await session.abortTransaction();
        return res.status(400).json({
          message: `Estoque insuficiente para o produto ${item.codigo_produto}`,
        });
      }

      // Atualizar o estoque
      produto.estoque[0].estoque -= item.quantidade;
      await produto.save({ session });
    }

    // Atualizar os dados da venda
    venda.cliente = cliente;
    venda.cliente_sem_cadastro = cliente_sem_cadastro;
    venda.vendedor = vendedor;
    venda.tipo = tipo;
    venda.observacoes = observacoes;
    venda.itens = itens;
    venda.forma_pagamento = forma_pagamento;
    venda.valores = valores;
    venda.historico = historico;
    venda.parcelas = parcelas;

    await venda.save({ session });

    // Criar novas movimentações financeiras
    for (const pagamento of forma_pagamento) {
      const novaMovimentacao = new Movimentacao({
        codigo_loja,
        codigo_empresa,
        caixaId: caixaAberto._id,
        caixa: caixaAberto.caixa,
        codigo_movimento,
        codigo_caixa: caixaAberto.codigo_caixa,
        tipo_movimentacao: "entrada",
        valor: pagamento.valor_pagamento,
        meio_pagamento: pagamento.meio_pagamento, // Aqui está o valor correto
        documento_origem: codigo_venda,
        origem: "venda",
        categoria_contabil: "receita",
        historico: JSON.stringify(historico) || "Venda alterada",
      });

      await novaMovimentacao.save({ session });
    }

    // Criar novas parcelas (caso venda seja a prazo)
    if (tipo === "aprazo" && parcelas) {
      for (const parcela of parcelas) {
        const novaParcela = new Receber({
          codigo_loja,
          codigo_empresa,
          documento_origem: codigo_venda,
          origem: "venda",
          vencimento: parcela.vencimento,
          valor: parcela.valor,
          status: "aberto",
        });
        await novaParcela.save({ session });
      }
    }

    await session.commitTransaction();
    res.status(200).json({ message: "Venda alterada com sucesso" });
  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({ error: error.message });
  } finally {
    session.endSession();
  }
};


exports.listarVendas = async (req, res) => {
  try {
    const {
      codigo_empresa,
      codigo_loja,
      status,
      page = 1,
      limit = 20,
      dataInicio,
      dataFim
    } = req.query;

    // Validate required parameters
    if (!codigo_empresa) {
      return res.status(400).json({
        message: 'Código da empresa é obrigatório'
      });
    }

    if (!codigo_loja) {
      return res.status(400).json({
        message: 'Código da loja é obrigatório'
      });
    }

    // Validate page and limit
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        message: 'Número de página inválido'
      });
    }

    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return res.status(400).json({
        message: 'Limite de registros inválido (deve estar entre 1 e 100)'
      });
    }

    // Validate date range if provided
    const query = {
      codigo_empresa,
      codigo_loja
    };

    // Validate status if provided
    if (status) {
      const validStatuses = ['pendente', 'concluido', 'cancelado']; // Add your valid statuses
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Status de venda inválido'
        });
      }
      query.status = status;
    }

    // Date range validation
    if (dataInicio && dataFim) {
      const startDate = new Date(dataInicio);
      const endDate = new Date(dataFim);

      // Validate date format
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({
          message: 'Formato de data inválido'
        });
      }

      // Ensure start date is before or equal to end date
      if (startDate > endDate) {
        return res.status(400).json({
          message: 'Data de início deve ser anterior ou igual à data final'
        });
      }

      query.createdAt = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const skip = (pageNumber - 1) * limitNumber;

    // Fetch sales with pagination and populate
    const vendas = await Venda.find(query)
      .populate({
        path: 'cliente',
        select: 'nome codigo_cliente', // Selecionar campos específicos
        match: { codigo_empresa, codigo_loja } // Filtrar cliente pela mesma empresa/loja
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean(); // Usar lean para melhor performance

    const total = await Venda.countDocuments(query);

    res.status(200).json({
      data: vendas,
      total,
      page: pageNumber,
      totalPages: Math.ceil(total / limitNumber),
      pageSize: limitNumber
    });
  } catch (error) {
    console.error('Erro ao listar vendas:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

exports.generateVendaPDF = async (req, res) => {
  try {
    console.log('Iniciando geração de PDF');
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      console.error('Faltando codigo_loja ou codigo_empresa');
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    const venda = await Venda.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    }).populate('cliente', 'nome cpf');

    if (!venda) {
      console.error('Venda não encontrada');
      return res.status(404).json({
        error: 'Venda não encontrada.',
      });
    }

    console.log('Venda encontrada:', venda);
    const templatePath = path.join(__dirname, '../views/venda.ejs');
    const html = await ejs.renderFile(templatePath, { venda });
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

    res.setHeader('Content-Disposition', 'attachment; filename=venda.pdf');
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: error.message });
  }
};

/* exports.generateVendaPDF = async (req, res) => {
  try {
    console.log('Iniciando geração de PDF');
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      console.error('Faltando codigo_loja ou codigo_empresa');
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    const venda = await Venda.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    }).populate('cliente', 'nome cpf');

    if (!venda) {
      console.error('Venda não encontrada');
      return res.status(404).json({
        error: 'Venda não encontrada.',
      });
    }

    console.log('Venda encontrada:', venda);
    const templatePath = path.join(__dirname, '../views/bobinaVenda.ejs');
    const html = await ejs.renderFile(templatePath, { venda });
    console.log('HTML gerado com sucesso');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded' });

    const pdfBuffer = await page.pdf({
      width: '80mm',
      printBackground: true,
      margin: {
        top: '2mm',
        right: '2mm',
        bottom: '2mm',
        left: '2mm'
      },
      preferCSSPageSize: true
    });

    console.log('PDF gerado com sucesso');

    await browser.close();

    res.setHeader('Content-Disposition', 'attachment; filename=venda.pdf');
    res.end(pdfBuffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: error.message });
  }
}; */