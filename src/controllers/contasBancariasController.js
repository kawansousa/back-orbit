const ContasBancarias = require("../models/contas_bancarias.model");
const MovimentacaoBanco = require("../models/movimentacoes_caixa.model");
const { body, validationResult } = require("express-validator");

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
      $or: [{ conta_bancaria }],
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

exports.listarContasBancarias = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, searchTerm, searchType } = req.query;

    const filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm && searchTerm.trim()) {
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
              filtros[searchType] = parseInt(termoBusca, 10);
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
              error:
                "Tipo de busca inválido. Use: todos, codigo_conta_bancaria, limite, saldo, conta_bancaria, tipo, status, agencia ou conta",
            });
        }
      }
    }

    const contasBancarias = await ContasBancarias.find(filtros);

    if (!contasBancarias || contasBancarias.length === 0) {
      return res.status(404).json({
        message: "Contas bancárias não encontradas para esta loja e empresa",
      });
    }

    res.status(200).json(contasBancarias);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

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

exports.listaMovimentacaoContaBancaria = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, codigo_conta_bancaria } = req.query;

    const filtros = {
      codigo_loja,
      codigo_empresa,
      codigo_conta_bancaria,
    };

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    if (!codigo_conta_bancaria) {
      return res.status(400).json({
        error: "O codigo_conta_bancaria é obrigatoria",
      });
    }

    const movimentacoesBancarias = await MovimentacaoBanco.find(filtros);

    res.status(200).json({
      data: movimentacoesBancarias,
    });
  } catch (error) {
    console.error("Erro ao buscar movimentações bancarias", error);
    res.status(500).json({
      error: "Erro interno do servidor ao buscar movimentações bancarias",
      message: error.message,
    });
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
        error:
          "Os campos codigo_loja, codigo_empresa e codigo_conta_bancaria são obrigatórios.",
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

    if (contaExiste.status !== "ativo") {
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

exports.criarMovimentacaoBancaria = async (req, res) => {
  const validations = [
    body("codigo_loja")
      .notEmpty()
      .withMessage("Código da loja é obrigatório")
      .trim(),

    body("codigo_empresa")
      .notEmpty()
      .withMessage("Código da empresa é obrigatório")
      .trim(),

    body("codigo_conta_bancaria")
      .notEmpty()
      .withMessage("Código da conta bancária é obrigatório")
      .trim(),

    body("tipo_movimentacao")
      .notEmpty()
      .withMessage("Tipo de movimentação é obrigatório"),

    body("valor")
      .notEmpty()
      .withMessage("Valor é obrigatório")
      .isFloat({ gt: 0 })
      .withMessage("Valor deve ser um número positivo maior que zero")
      .toFloat(),

    body("meio_pagamento")
      .notEmpty()
      .withMessage("Meio de pagamento é obrigatório"),
  ];

  try {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: "Dados inválidos",
        errors: errors.array().map((error) => ({
          campo: error.path,
          mensagem: error.msg,
          valor_recebido: error.value,
        })),
      });
    }

    const {
      codigo_loja,
      codigo_empresa,
      codigo_conta_bancaria,
      tipo_movimentacao,
      valor,
      meio_pagamento,
    } = req.body;

    const newMovement = new MovimentacaoBanco({
      codigo_loja,
      codigo_empresa,
      codigo_conta_bancaria,
      status: "ativo",
      tipo_movimentacao,
      valor: parseFloat(valor.toFixed(2)),
      origem: "banco_manual",
      documento_origem: "manual",
      meio_pagamento,
      categoria_contabil: "2.1.1",
      data_movimentacao: new Date(),
    });
    await newMovement.save();

    const contaBancaria = await ContasBancarias.findOne({
      codigo_loja: newMovement.codigo_loja,
      codigo_empresa: newMovement.codigo_empresa,
      codigo_conta_bancaria: newMovement.codigo_conta_bancaria,
    });

    if (newMovement.tipo_movimentacao === "entrada") {
      contaBancaria.saldo += newMovement.valor;
    }
    if (newMovement.tipo_movimentacao === "saida") {
      contaBancaria.saldo -= newMovement.valor;
    }
    await contaBancaria.save();

    res.status(201).json(newMovement);
  } catch (error) {
    console.error("Erro ao criar movimentação bancária:", {
      message: error.message,
      stack: error.stack,
      body: req.body,
    });

    if (error.name === "ValidationError") {
      const mongoErrors = Object.values(error.errors).map((err) => ({
        campo: err.path,
        mensagem: err.message,
        valor_recebido: err.value,
      }));

      return res.status(400).json({
        success: false,
        message: "Erro de validação do banco de dados",
        errors: mongoErrors,
      });
    }

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Já existe uma movimentação com esses dados",
      });
    }

    if (
      error.name === "MongoNetworkError" ||
      error.name === "MongoTimeoutError"
    ) {
      return res.status(503).json({
        success: false,
        message:
          "Erro de conexão com o banco de dados. Tente novamente em alguns instantes",
      });
    }

    res.status(500).json({
      success: false,
      message: "Erro interno do servidor",
      error:
        process.env.NODE_ENV === "development" ? error.message : "Erro interno",
    });
  }
};
