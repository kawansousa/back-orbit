const Orcamento = require("../models/orcamentos.model");
const Cliente = require("../models/clientes.model")
const ejs = require("ejs");
const path = require("path");
const puppeteer = require("puppeteer");
const chromium = require("chrome-aws-lambda");
const Loja = require("../models/lojas.model");

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
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    if (!cliente && !cliente_sem_cadastro) {
      return res.status(400).json({
        error:
          "É necessário informar um cliente cadastrado ou dados do cliente sem cadastro.",
      });
    }

    if (!itens || itens.length === 0) {
      return res.status(400).json({
        error: "O orçamento deve conter pelo menos um item.",
      });
    }

    // Verifica se o cliente existe (se for um cliente cadastrado)
    if (cliente) {
      const clienteExiste = await Cliente.findById(cliente);
      if (!clienteExiste) {
        return res.status(404).json({
          error: "Cliente não encontrado.",
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
      historico: [
        {
          status_anterior: null,
          status_novo: "aberto",
          usuario: vendedor,
        },
      ],
    });

    await novoOrcamento.save();

    res.status(201).json({
      message: "Orçamento criado com sucesso",
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
      limit,
      searchTerm,
      searchType,
    } = req.query;

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
    let baseMatch = { codigo_loja, codigo_empresa };

    if (status) baseMatch.status = status;
    if (cliente) baseMatch.cliente = cliente;
    if (vendedor) baseMatch.vendedor = vendedor;
    if (data_inicial || data_final) {
      baseMatch.data_emissao = {};
      if (data_inicial) baseMatch.data_emissao.$gte = new Date(data_inicial);
      if (data_final) baseMatch.data_emissao.$lte = new Date(data_final);
    }

    const aggregatePipeline = [];

    aggregatePipeline.push({ $match: baseMatch });

    aggregatePipeline.push({
      $lookup: {
        from: "clientes",
        localField: "cliente",
        foreignField: "_id",
        as: "cliente_populated",
      },
    });

    aggregatePipeline.push({
      $unwind: {
        path: "$cliente_populated",
        preserveNullAndEmptyArrays: true,
      },
    });

    aggregatePipeline.push({
      $addFields: {
        cliente: {
          $cond: {
            if: { $ifNull: ["$cliente_populated", false] },
            then: {
              _id: "$cliente_populated._id",
              nome: "$cliente_populated.nome",
              cpf: "$cliente_populated.cpf",
            },
            else: "$cliente_sem_cadastro",
          },
        },
      },
    });

    aggregatePipeline.push({
      $project: {
        cliente_populated: 0,
      },
    });

    const orConditions = [];
    if (searchTerm && searchTerm.trim() !== "") {
      const termoBusca = searchTerm.trim();

      if (searchType === "todos" || !searchType) {
        if (!isNaN(termoBusca)) {
          orConditions.push({ codigo_orcamento: parseInt(termoBusca, 10) });
        }
        orConditions.push({ vendedor: { $regex: termoBusca, $options: "i" } });
        orConditions.push({ status: { $regex: termoBusca, $options: "i" } });
        orConditions.push({
          "cliente.nome": { $regex: termoBusca, $options: "i" },
        });
      } else if (searchType === "codigo_orcamento" && !isNaN(termoBusca)) {
        orConditions.push({ codigo_orcamento: parseInt(termoBusca, 10) });
      } else if (searchType === "cliente") {
        orConditions.push({
          "cliente.nome": { $regex: termoBusca, $options: "i" },
        });
      } else if (searchType === "vendedor") {
        orConditions.push({ vendedor: { $regex: termoBusca, $options: "i" } });
      } else if (searchType === "status") {
        orConditions.push({ status: { $regex: termoBusca, $options: "i" } });
      }

      if (orConditions.length > 0) {
        aggregatePipeline.push({ $match: { $or: orConditions } });
      }
    }

    const totalPipeline = [
      { $match: baseMatch },
      {
        $lookup: {
          from: "clientes",
          localField: "cliente",
          foreignField: "_id",
          as: "cliente_populated",
        },
      },
      {
        $unwind: {
          path: "$cliente_populated",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          cliente: {
            $cond: {
              if: { $ifNull: ["$cliente_populated", false] },
              then: {
                _id: "$cliente_populated._id",
                nome: "$cliente_populated.nome",
                cpf: "$cliente_populated.cpf",
              },
              else: "$cliente_sem_cadastro",
            },
          },
        },
      },
    ];

    if (orConditions.length > 0) {
      totalPipeline.push({ $match: { $or: orConditions } });
    }

    totalPipeline.push({ $count: "total" });

    const totalResult = await Orcamento.aggregate(totalPipeline);
    const total = totalResult.length > 0 ? totalResult[0].total : 0;

    aggregatePipeline.push(
      { $sort: { data_emissao: -1 } },
      { $skip: skip },
      { $limit: limitNumber }
    );

    const orcamentos = await Orcamento.aggregate(aggregatePipeline);

    if (orcamentos.length === 0) {
      return res.status(404).json({
        message: "Nenhum orçamento encontrado para os filtros fornecidos.",
      });
    }

    res.status(200).json({
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
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
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    }).populate("cliente", "nome cpf");

    if (!orcamento) {
      return res.status(404).json({
        error: "Orçamento não encontrado.",
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
    const usuario = req.body.usuario || "Sistema"; 

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    if (!cliente && !cliente_sem_cadastro) {
      return res.status(400).json({
        error:
          "É necessário informar um cliente cadastrado ou dados do cliente sem cadastro.",
      });
    }

    if (!itens || itens.length === 0) {
      return res.status(400).json({
        error: "O orçamento deve conter pelo menos um item.",
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
        error: "Orçamento não encontrado.",
      });
    }

    if (orcamento.status !== "aberto") {
      return res.status(400).json({
        error: "Apenas orçamentos abertos podem ser alterados.",
      });
    }

    // Atualiza os itens e recalcula os valores se houver novos itens
    if (itens) {
      const itensCalculados = itens.map((item) => {
        const subtotal_unitario = item.preco_unitario * item.quantidade;
        const desconto =
          (subtotal_unitario * (item.desconto_percentual || 0)) / 100 +
          (item.desconto_valor || 0);
        const total_unitario = subtotal_unitario - desconto;

        return {
          ...item,
          subtotal_unitario,
          total_unitario,
        };
      });

      const subtotal = itensCalculados.reduce(
        (acc, item) => acc + item.subtotal_unitario,
        0
      );
      const desconto_total = itensCalculados.reduce(
        (acc, item) =>
          acc +
          ((item.desconto_percentual || 0) * item.subtotal_unitario) / 100 +
          (item.desconto_valor || 0),
        0
      );
      const total = subtotal - desconto_total;

      orcamento.itens = itensCalculados;
    }

    // Atualiza os outros campos recebidos
    if (cliente !== undefined) orcamento.cliente = cliente;
    if (cliente_sem_cadastro !== undefined)
      orcamento.cliente_sem_cadastro = cliente_sem_cadastro;
    if (vendedor !== undefined) orcamento.vendedor = vendedor;

    if (status && status !== orcamento.status) {
      orcamento.historico.push({
        status_anterior: orcamento.status,
        status_novo: status,
        usuario,
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
      message: "Orçamento atualizado com sucesso",
      orcamento,
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
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    if (!orcamento) {
      return res.status(404).json({
        error: "Orçamento não encontrado.",
      });
    }

    if (orcamento.status !== "aberto") {
      return res.status(400).json({
        error: "Apenas orçamentos abertos podem ser excluídos.",
      });
    }

    await orcamento.deleteOne();

    res.status(200).json({
      message: "Orçamento excluído com sucesso",
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.cancelarOrcamento = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;
    const usuario = req.body.usuario || "Sistema"; 

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    if (!orcamento) {
      return res.status(404).json({
        error: "Orçamento não encontrado.",
      });
    }

    if (orcamento.status !== "aberto") {
      return res.status(400).json({
        error: "Apenas orçamentos abertos podem ser cancelados.",
      });
    }

    orcamento.status = "cancelado";
    orcamento.historico.push({
      status_anterior: "aberto",
      status_novo: "cancelado",
      usuario,
    });

    await orcamento.save();

    res.status(200).json({
      message: "Orçamento cancelado com sucesso",
      orcamento,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.generateOrcamentoPDF = async (req, res) => {
  try {
    console.log("Iniciando geração de PDF");
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

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    }).populate("cliente", "nome cpf");

    if (!orcamento) {
      console.error("Orçamento não encontrado");
      return res.status(404).json({
        error: "Orçamento não encontrado.",
      });
    }

    const empresa = loja.empresas.find(
      (emp) => emp.codigo_empresa === parseInt(codigo_empresa)
    );
    const logo = empresa ? empresa.logo : null;
    const rodape = empresa ? empresa.rodape : null;

    console.log("Orçamento encontrado:", orcamento);
    const templatePath = path.join(__dirname, "../views/orcamento.ejs");
    const html = await ejs.renderFile(templatePath, {
      orcamento,
      logo,
      rodape,
    });
    console.log("HTML gerado com sucesso");

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

    console.log("PDF gerado com sucesso");

    await browser.close();

    res.setHeader("Content-Disposition", "attachment; filename=orcamento.pdf");
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.updateOrcamentoStatus = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, status } = req.body;
    const usuario = req.body.usuario || "Sistema";

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    if (!status) {
      return res.status(400).json({
        error: "O campo status é obrigatório.",
      });
    }

    const orcamento = await Orcamento.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    if (!orcamento) {
      return res.status(404).json({
        error: "Orçamento não encontrado.",
      });
    }
    if (orcamento.status === "aberto" && status === "convertido") {
      orcamento.historico.push({
        status_anterior: orcamento.status,
        status_novo: status,
        usuario,
        data_alteracao: new Date(),
      });
      orcamento.status = status;

      await orcamento.save();

      res.status(200).json({
        message: "Status do orçamento atualizado com sucesso",
        orcamento,
      });
    } else {
      return res.status(400).json({
        error: `Não é possível alterar o status de '${orcamento.status}' para '${status}'.`,
      });
    }
  } catch (error) {
    console.error("Erro ao atualizar status do orçamento:", error);
    res.status(500).json({ error: error.message });
  }
};
