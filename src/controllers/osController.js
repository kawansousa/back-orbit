const Os = require("../models/os.model");
const Cidades = require("../models/cidades.model");
const Loja = require("../models/lojas.model");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const Movimentacao = require("../models/movimentacoes_caixa.model");
const Caixa = require("../models/caixa.model");
const mongoose = require("mongoose");

exports.listaOs = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit, searchTerm, searchType } =
      req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        error: "Os valores de page e limit devem ser maiores que 0.",
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    const filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm) {
      if (searchType === "codigo") {
        const codigoNumerico = parseInt(searchTerm, 10);
        if (!isNaN(codigoNumerico)) {
          filtros.codigo_os = codigoNumerico;
        } else {
          filtros.codigo_os = { $regex: searchTerm, $options: "i" };
        }
      } else if (searchType === "cliente") {
        filtros.$or = [
          { "cliente.nome": { $regex: searchTerm, $options: "i" } },
          {
            "cliente_sem_cadastro.nome": { $regex: searchTerm, $options: "i" },
          },
        ];
      } else if (searchType === "responsavel") {
        filtros.responsavel = { $regex: searchTerm, $options: "i" };
      } else {
        const codigoNumerico = parseInt(searchTerm, 10);
        filtros.$or = [
          ...(!isNaN(codigoNumerico) ? [{ codigo_os: codigoNumerico }] : []),
          { codigo_os: { $regex: searchTerm, $options: "i" } },
          { "cliente.nome": { $regex: searchTerm, $options: "i" } },
          {
            "cliente_sem_cadastro.nome": { $regex: searchTerm, $options: "i" },
          },
          { responsavel: { $regex: searchTerm, $options: "i" } },
        ];
      }
    }

    // Log para debug
    console.log("Filtros aplicados:", JSON.stringify(filtros, null, 2));

    // Consulta ao banco de dados
    const lista = await Os.find(filtros)
      .skip(skip)
      .limit(limitNumber)
      .sort({ dataAbertura: -1 });

    const total = await Os.countDocuments(filtros);

    // Log para debug
    console.log(
      `Encontrados ${total} registros para searchTerm: "${searchTerm}", searchType: "${searchType}"`
    );

    if (lista.length === 0 && searchTerm) {
      return res.status(404).json({
        message:
          "Nenhuma ordem de serviço encontrada para os filtros fornecidos.",
        total: 0,
        page: pageNumber,
        limit: limitNumber,
        totalPages: 0,
        data: [],
      });
    }

    res.status(200).json({
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      data: lista,
    });
  } catch (error) {
    console.error("Erro ao listar OS:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.createOs = async (req, res) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    const {
      codigo_loja,
      codigo_empresa,
      codigo_os,
      cliente,
      cliente_sem_cadastro,
      status,
      dataAbertura,
      dataFechamento,
      responsavel,
      observacoes,
      itens,
      servicos,
      forma_pagamento,
      codigo_movimento,
      parcelas,
    } = req.body;

    if (!codigo_loja || !codigo_empresa || !codigo_os) {
      return res.status(400).json({
        error:
          "Os campos codigo_loja, codigo_empresa e codigo_os são obrigatórios.",
      });
    }

    const novaOs = new Os({
      codigo_loja,
      codigo_empresa,
      codigo_os,
      cliente: cliente || undefined,
      cliente_sem_cadastro: cliente_sem_cadastro || undefined,
      status: status || "aberta",
      dataAbertura: dataAbertura ? new Date(dataAbertura) : new Date(),
      dataFechamento: dataFechamento ? new Date(dataFechamento) : null,
      responsavel,
      observacoes,
      itens,
      servicos,
      forma_pagamento,
      parcelas,
    });

    const caixa = await Caixa.findOne({
      codigo_loja,
      codigo_empresa,
      status: "aberto",
    }).session(session);

    // Register cash movements for each payment method
    const movimentacoes = forma_pagamento.map(
      (pagamento) =>
        new Movimentacao({
          codigo_loja,
          codigo_empresa,
          caixaId: caixa._id,
          codigo_movimento,
          caixa: caixa.caixa,
          codigo_caixa: caixa.codigo_caixa,
          tipo_movimentacao: "entrada",
          valor: pagamento.valor_pagamento,
          meio_pagamento: pagamento.meio_pagamento,
          documento_origem: novaOs.codigo_os,
          origem: "os",
          categoria_contabil: "1.1.1",
        })
    );

    const recebimentos = [];

    if (novaOs.tipo === "aprazo") {
      for (let i = 0; i < parcelas.length; i++) {
        const { valor_total, data_vencimento, observacao, codigo_receber } =
          parcelas[i];

        if (!valor_total || valor_total <= 0) {
          throw new Error(`Valor total inválido na parcela ${i + 1}`);
        }

        const novoReceber = new Receber({
          codigo_loja,
          codigo_empresa,
          cliente,
          origem: "venda",
          documento_origem: novaOs.codigo_venda,
          valor_total,
          valor_restante: valor_total,
          data_vencimento,
          codigo_receber,
          observacao,
          status: "aberto",
          fatura: `${i + 1}/${parcelas.length}`,
        });

        recebimentos.push(novoReceber);
      }
    }

    // Save all documents within the transaction
    await Promise.all([
      ...movimentacoes.map((mov) => mov.save({ session })),
      caixa.save({ session }),
      novaOs.save({ session }),
      ...recebimentos.map((receb) => receb.save({ session })),
    ]);

    await novaOs.save();

    res.status(201).json({
      message: "Ordem de Serviço criada com sucesso",
      os: novaOs,
    });
  } catch (error) {
    console.error("Erro ao criar OS:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getOsById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    // Find client by ID, validating store and company
    const Os = await Os.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    // Check if client was found
    if (!Os) {
      return res.status(404).json({
        error: "Os não encontrado para essa loja e empresa.",
      });
    }

    // Find the city based on the city code in the client's address
    const cidade = await Cidades.findOne({
      codigo: parseInt(Os.endereco.cidade, 10),
    });

    if (cidade) {
      Os.endereco.cidade = cidade.nome;
    }

    // Return found client with city name
    res.status(200).json(Os);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateOs = async (req, res) => {
  const { codigo_loja, codigo_empresa, nome } = req.body;

  try {
    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    // Validate name if present
    if (nome !== undefined && nome.trim() === "") {
      return res.status(400).json({ error: "Preencha o nome" });
    }

    // Update client, validating store and company
    const updatedOs = await Os.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    // Check if client was found and updated
    if (!updatedOs) {
      return res.status(404).json({
        error: "Os não encontrado para essa loja e empresa.",
      });
    }

    // Return updated client
    res.status(200).json({
      message: "Os atualizado",
      Os: updatedOs,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteOs = async (req, res) => {
  try {
    const Os = await Os.findByIdAndDelete(req.params.id);
    if (!Os) {
      return res.status(404).json({ error: "Os não encontrado" });
    }
    res.status(200).json({ message: "Os removido com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateOsPDF = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      console.error("Faltando codigo_loja ou codigo_empresa");
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const loja = await Loja.findOne({
      codigo_loja,
      "empresas.codigo_empresa": codigo_empresa,
    });

    if (!loja) {
      console.error("Loja não encontrada");
      return res.status(404).json({
        error: "Loja não encontrada.",
      });
    }

    const os = await Os.findOne({
      codigo_os: req.params.id,
      codigo_loja,
      codigo_empresa,
    }).populate("cliente", "nome cpf");

    if (!os) {
      console.error("Venda não encontrada");
      return res.status(404).json({
        error: "Venda não encontrada.",
      });
    }

    // Find the logo for the specific empresa
    const empresa = loja.empresas.find(
      (emp) => emp.codigo_empresa === parseInt(codigo_empresa)
    );
    const logo = empresa ? empresa.logo : null;
    const rodape = empresa ? empresa.rodape : null;

    const templatePath = path.join(__dirname, "../views/os.ejs");
    const html = await ejs.renderFile(templatePath, {
      os,
      logo,
      rodape,
    });

    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20px",
        right: "20px",
        bottom: "20px",
        left: "20px",
      },
      preferCSSPageSize: true,
    });

    await browser.close();

    res.setHeader("Content-Disposition", "attachment; filename=venda.pdf");
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).json({ error: error.message });
  }
};
