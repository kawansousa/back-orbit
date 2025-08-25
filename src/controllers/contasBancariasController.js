const ContasBancarias = require("../models/contas_bancarias.model");
const MovimentacaoBanco = require("../models/movimentacoes_banco.model");
const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

exports.adicionarContaBancaria = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      conta_bancaria,
      codigo_conta_bancaria,
      status,
      agencia,
      conta,
      tipo,
      limite,
      saldo,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    if (!conta_bancaria) {
      return res.status(400).json({ error: "A descricao é obrigatória." });
    }

    const ContaExistente = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      $or: [
        { conta_bancaria }, // Verifica a descrição
      ],
    });

    // if (ContaExistente) {
    //   if (produtoExistente.conta_bancaria == conta_bancaria) {
    //     return res.status(409).json({
    //       error: 'Já existe um item cadastrado com essa descrição.',
    //     });
    //   }
    // }

    const novaContasBancarias = new ContasBancarias({
      codigo_loja,
      codigo_empresa,
      conta_bancaria,
      codigo_conta_bancaria,
      status,
      agencia,
      conta,
      tipo,
      limite,
      saldo,
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
    const { codigo_loja, codigo_empresa, searchTerm, searchType } = req.query;

    const filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm && searchTerm.trim()) {
      // Removido || ""
      const termoBusca = searchTerm.trim();

      if (searchType === "todos") {
        const conditions = [];

        if (!isNaN(termoBusca)) {
          conditions.push({ limite: parseInt(termoBusca, 10) });
          conditions.push({ saldo: parseInt(termoBusca, 10) });
        }

        conditions.push({
          conta_bancaria: { $regex: termoBusca, $options: "i" },
        });
        conditions.push({ tipo: { $regex: termoBusca, $options: "i" } });
        conditions.push({ agencia: { $regex: termoBusca, $options: "i" } });
        conditions.push({ conta: { $regex: termoBusca, $options: "i" } });

        filtros.$or = conditions;
      } else {
        switch (searchType) {
          case "codigo_conta_bancaria":
          case "limite":
          case "saldo":
            if (!isNaN(termoBusca)) {
              filtros[searchType] = parseInt(termoBusca, 10); // Corrigido: searchTpe -> searchType
            } else {
              filtros[searchType] = -1;
            }
            break;
          case "conta_bancaria":
          case "tipo":
          case "status":
          case "agencia":
          case "conta":
            filtros[searchType] = { $regex: termoBusca, $options: "i" };
            break;
          default:
            return res.status(400).json({
              // Adicionado return
              error:
                "Tipo de busca inválido. Use: todos, codigo_conta_bancaria, limite, saldo, conta_bancaria, tipo, status, agencia ou conta",
            });
        }
      }
    }

    const contasBancarias = await ContasBancarias.find(filtros); // Renomeado para plural

    if (!contasBancarias || contasBancarias.length === 0) {
      // Verificação melhorada
      return res.status(404).json({
        message: "Contas bancárias não encontradas para esta loja e empresa",
      });
    }

    res.status(200).json(contasBancarias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar uma conta no ContasBancarias
exports.atualizarContaBancaria = async (req, res) => {
  const { codigo_loja, codigo_empresa } = req.body;

  try {
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const updatedProduto = await ContasBancarias.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    if (!updatedProduto) {
      return res.status(404).json({ message: "Conta não encontrada" });
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
    const { codigo_loja, codigo_empresa, tipo_conta, codigo_pai } = req.body;

    const ContasBancarias = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
    });

    if (!ContasBancarias) {
      return res.status(404).json({
        message: "ContasBancarias não encontrado para esta loja e empresa",
      });
    }

    let conta;
    switch (tipo_conta) {
      case "receitas_operacional":
        conta = ContasBancarias.receitas_operacional.id(codigo_pai);
        break;
      case "deducoes":
        conta = ContasBancarias.deducoes.id(codigo_pai);
        break;
      case "custo":
        conta = ContasBancarias.custo.id(codigo_pai);
        break;
      case "despesas_operacionais":
        conta = ContasBancarias.despesas_operacionais.id(codigo_pai);
        break;
      case "outras_dispesas_receitas":
        conta = ContasBancarias.outras_dispesas_receitas.id(codigo_pai);
        break;
      default:
        return res.status(400).json({ message: "Tipo de conta inválido" });
    }

    if (!conta) {
      return res.status(404).json({ message: "Conta não encontrada" });
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
      console.error("Faltando codigo_loja ou codigo_empresa");
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const ContasBancarias = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
    });

    if (!ContasBancarias) {
      console.error("ContasBancarias não encontrado");
      return res.status(404).json({
        error: "ContasBancarias não encontrado.",
      });
    }

    const templatePath = path.join(__dirname, "../views/ContasBancarias.ejs");
    const html = await ejs.renderFile(templatePath, { ContasBancarias });

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

    res.setHeader(
      "Content-Disposition",
      "attachment; filename=ContasBancarias.pdf"
    );
    res.end(pdfBuffer);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.registrarMovimentacaoBanco = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      tipo_movimentacao,
      codigo_movimento_banco,
      valor,
      origem,
      meio_pagamento,
      documento_origem,
      categoria_contabil,
      obsevacao,
    } = req.body;

    const contasBancarias = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      conta_padrao: true,
    });

    if (!contasBancarias || contasBancarias.conta_padrao !== true) {
      return res.status(400).json({ message: "Caixa não está aberto" });
    }

    const novaMovimentacaoBanco = new MovimentacaoBanco({
      codigo_loja: contasBancarias.codigo_loja,
      codigo_empresa: contasBancarias.codigo_empresa,
      codigo_movimento_banco,
      conta_bancaria: contasBancarias.codigo_conta_bancaria,
      tipo_movimentacao,
      valor,
      origem,
      documento_origem,
      numero_movimentacao: Date.now(), // Geração simples de número único
      meio_pagamento,
      categoria_contabil,
      obsevacao,
    });

    await novaMovimentacaoBanco.save();
    res.status(201).json(novaMovimentacaoBanco);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.listaMovimentacaoContaBancaria = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    const caixa = await MovimentacaoBanco.findById(caixaId);

    if (!caixa) {
      return res.status(404).json({ message: "Caixa não encontrado" });
    }

    // Find all transactions for this cash register
    const movimentacoes = await MovimentacaoBanco.find({ caixaId: caixa._id });

    // Calculate summary statistics
    const totalReceitas = movimentacoes
      .filter((mov) => mov.tipo_movimentacao === "entrada")
      .reduce((sum, mov) => sum + mov.valor, 0);

    const totalDespesas = movimentacoes
      .filter((mov) => mov.tipo_movimentacao === "saida")
      .reduce((sum, mov) => sum + mov.valor, 0);

    // Calculate payment method totals
    const pagamentoStats = movimentacoes.reduce((acc, mov) => {
      const method = mov.meio_pagamento.toLowerCase();
      acc[method] = (acc[method] || 0) + mov.valor;
      return acc;
    }, {});

    // Calculate total movement (sum of all payment methods)
    const total_movimento = Object.values(pagamentoStats).reduce(
      (sum, valor) => sum + valor,
      0
    );

    // Calculate total movement including initial balance
    const movimentacao_total = total_movimento + caixa.saldo_inicial;

    res.status(200).json({
      caixa,
      movimentacoes,
      resumo: {
        saldoAnterior: caixa.saldo_inicial,
        saldoAtual: caixa.saldo_final,
        totalReceitas,
        totalDespesas,
        pagamentoStats,
        total_movimento,
        movimentacao_total,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.saldoTotalContasBancarias = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    const filtros = { codigo_loja, codigo_empresa };

    const contasBancarias = await ContasBancarias.find(filtros);

    const saldoTotal = contasBancarias.reduce((acc, item) => {
      return acc + (item?.saldo || 0);
    }, 0);

    res.status(200).json({
      saldo_total: saldoTotal,
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
    });
  }
};

exports.definirContaPadrao = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, codigo_conta_bancaria } = req.body;

    if (!codigo_loja || !codigo_empresa || !codigo_conta_bancaria) {
      return res.status(400).json({
        error: "Os campos codigo_loja, codigo_empresa e codigo_conta_bancaria são obrigatórios.",
      });
    }

    const contaExiste = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      codigo_conta_bancaria,
    });

    if (!contaExiste) {
      return res.status(404).json({
        error: "Conta bancária não encontrada.",
      });
    }

    if (contaExiste.status !== 'ativo') {
      return res.status(400).json({
        error: "Não é possível definir como padrão uma conta inativa.",
      });
    }

    await ContasBancarias.updateMany(
      { codigo_loja, codigo_empresa },
      { $unset: { conta_padrao: "" } }
    );

    const contaAtualizada = await ContasBancarias.findOneAndUpdate(
      { codigo_loja, codigo_empresa, codigo_conta_bancaria },
      { conta_padrao: true },
      { new: true }
    );

    res.status(200).json({
      message: "Conta bancária definida como padrão com sucesso.",
      conta: contaAtualizada,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.obterContaPadrao = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const contaPadrao = await ContasBancarias.findOne({
      codigo_loja,
      codigo_empresa,
      conta_padrao: true,
    });

    if (!contaPadrao) {
      return res.status(404).json({
        message: "Nenhuma conta padrão encontrada para esta loja e empresa.",
      });
    }

    res.status(200).json(contaPadrao);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.removerContaPadrao = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const resultado = await ContasBancarias.updateMany(
      { codigo_loja, codigo_empresa, conta_padrao: true },
      { $unset: { conta_padrao: "" } }
    );

    if (resultado.modifiedCount === 0) {
      return res.status(404).json({
        message: "Nenhuma conta padrão encontrada para remover.",
      });
    }

    res.status(200).json({
      message: "Marcação de conta padrão removida com sucesso.",
      contas_atualizadas: resultado.modifiedCount,
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
