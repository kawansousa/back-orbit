const mongoose = require("mongoose");
const Entrada = require("../models/entradas.model");
const Produto = require("../models/produtos.model");
const Pagar = require("../models/pagar.model");
const Fornecedor = require("../models/fornecedores.model")

exports.createEntrada = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_entrada,
      entrada,
      forma_pagamento,
      status,
      xml,
      fornecedor,
      itens,
      encargos,
    } = req.body;

    if (
      !codigo_loja ||
      !codigo_empresa ||
      !codigo_entrada ||
      !entrada ||
      !fornecedor ||
      !itens ||
      !forma_pagamento
    ) {
      throw new Error("Campos obrigatórios ausentes.");
    }

    if (!Array.isArray(forma_pagamento) || forma_pagamento.length === 0) {
      throw new Error("forma_pagamento deve ser um array não vazio.");
    }
    for (const pg of forma_pagamento) {
      if (!pg.meio_pagamento || !pg.valor_pagamento) {
        throw new Error(
          "Cada forma de pagamento deve conter meio_pagamento e valor_pagamento."
        );
      }
    }

    const newEntrada = new Entrada({
      codigo_loja,
      codigo_empresa,
      codigo_entrada,
      entrada,
      forma_pagamento,
      status,
      xml,
      fornecedor,
      itens,
      encargos,
    });

    for (const item of itens) {
      const produto = await Produto.findOne({
        codigo_produto: item.codigo_produto,
        codigo_loja,
        codigo_empresa,
      });
      if (!produto) continue;

      const qt = Number(item.quantidade) || 0;
      produto.estoque[0].estoque += qt;

      produto.precos = [
        {
          preco_compra: item.precos.preco_compra,
          cma: item.precos.cma,
          preco_venda: item.precos.preco_venda,
          preco_atacado: item.precos.preco_atacado,
          lucro_venda: item.precos.lucro_venda,
          lucro_atacado: item.precos.lucro_atacado,
          ultimos_precos: {
            ultimo_preco_compra: produto.precos[0]?.preco_compra || 0,
            ultimo_cma: produto.precos[0]?.cma || 0,
            ultimo_preco_venda: produto.precos[0]?.preco_venda || 0,
            ultimo_preco_atacado: produto.precos[0]?.preco_atacado || 0,
            ultimo_lucro_venda: produto.precos[0]?.lucro_venda || 0,
            ultimo_lucro_atacado: produto.precos[0]?.lucro_atacado || 0,
          },
        },
      ];

      produto.encargos = [
        {
          ncm: item.ncm,
          cest: encargos?.cest || 0,
          icms: encargos?.icms || 0,
          ipi: encargos?.ipi || 0,
          pis: encargos?.pis || 0,
          cofins: encargos?.cofins || 0,
        },
      ];

      await produto.save({ session });
    }

    await newEntrada.save({ session });

    const pgAPrazo = forma_pagamento.find((p) => p.meio_pagamento === "aprazo");
    if (pgAPrazo) {
      const { parcelas } = pgAPrazo;
      if (!Array.isArray(parcelas) || parcelas.length === 0) {
        throw new Error("Parcelas obrigatórias para pagamento a prazo.");
      }

      const last = await Pagar.findOne({ codigo_loja, codigo_empresa })
        .sort({ codigo_pagar: -1 })
        .select("codigo_pagar")
        .lean();
      let nextCodigoPagar = last ? last.codigo_pagar + 1 : 1;

      const pagamentos = parcelas.map((parc, idx) => {
        const { valor_total, data_vencimento } = parc;
        if (!valor_total || valor_total <= 0) {
          throw new Error(`Valor inválido na parcela ${idx + 1}`);
        }
        if (!data_vencimento) {
          throw new Error(
            `Data de vencimento obrigatória na parcela ${idx + 1}`
          );
        }
        return {
          codigo_loja,
          codigo_empresa,
          codigo_pagar: nextCodigoPagar + idx,
          fornecedor,
          origem: "entrada",
          categoria: "outros",
          documento_origem: codigo_entrada,
          valor_total,
          descricao: "Entrada de produtos no estoque",
          valor_restante: valor_total,
          data_vencimento: new Date(data_vencimento),
          status: "aberto",
          fatura: `${idx + 1}/${parcelas.length}`,
        };
      });

      await Pagar.insertMany(pagamentos, { session });
    }

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: "Entrada criada com sucesso",
      entrada: newEntrada,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ error: error.message });
  }
};

exports.getEntradas = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit, searchTerm, searchType } =
      req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ error: "codigo_loja e codigo_empresa são obrigatórios." });
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;
    const skip = (pageNumber - 1) * limitNumber;
    const filtros = { codigo_loja, codigo_empresa };

    if (searchTerm && searchTerm.trim() !== "") {
      const termoBusca = searchTerm.trim();

      if (searchType === "todos") {
        const fornecedoresEncontrados = await Fornecedor.find({
          $or: [
            { razao_social: { $regex: termoBusca, $options: "i" } },
            { nome_fantasia: { $regex: termoBusca, $options: "i" } },
          ],
        }).select("_id");

        const fornecedorIds = fornecedoresEncontrados.map((f) => f._id);
        const conditions = [];

        if (!isNaN(termoBusca)) {
          conditions.push({ codigo_entrada: parseInt(termoBusca, 10) });
        }

        if (fornecedorIds.length > 0) {
          conditions.push({ fornecedor: { $in: fornecedorIds } });
        }

        filtros.$or = conditions;
      } else {
        switch (searchType) {
          case "codigo_entrada":
            if (!isNaN(termoBusca)) {
              filtros[searchType] = parseInt(termoBusca, 10);
            } else {
              filtros[searchType] = -1;
            }
            break;
          case "fornecedor_razao":
            const fornecedoresPorRazao = await Fornecedor.find({
              razao_social: { $regex: termoBusca, $options: "i" },
            }).select("_id");
            if (fornecedoresPorRazao.length > 0) {
              filtros.fornecedor = {
                $in: fornecedoresPorRazao.map((f) => f._id),
              };
            } else {
              filtros.fornecedor = null;
            }
            break;
          case "fornecedor_fantasia":
            const fornecedoresPorFantasia = await Fornecedor.find({
              nome_fantasia: { $regex: termoBusca, $options: "i" },
            }).select("_id");
            if (fornecedoresPorFantasia.length > 0) {
              filtros.fornecedor = {
                $in: fornecedoresPorFantasia.map((f) => f._id),
              };
            } else {
              filtros.fornecedor = null; 
            }
            break;
          default:
            return res.status(400).json({
              error:
                "Tipo de busca inválido. Use: todos, codigo_entrada, fornecedor_razao, fornecedor_fantasia, fornecedor_cnpj",
            });
        }
      }
    }

    const entradas = await Entrada.find(filtros)
      .populate("fornecedor", "razao_social nome_fantasia")
      .skip(skip)
      .limit(limitNumber);

    const totalEntradas = await Entrada.countDocuments(filtros);

    if (entradas.length === 0) {
      return res.status(404).json({
        message: "Nenhuma entrada encontrada para os filtros fornecidos.",
      });
    }

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

    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ error: "codigo_loja e codigo_empresa são obrigatórios." });
    }

    const entrada = await Entrada.findOne({
      _id: id,
      codigo_loja,
      codigo_empresa,
    }).populate("fornecedor", "razao_social nome_fantasia");

    if (!entrada) {
      return res
        .status(404)
        .json({ error: "Entrada não encontrada para essa loja e empresa." });
    }

    res.status(200).json(entrada);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateEntrada = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo_loja,
      codigo_empresa,
      fornecedor,
      numero_nota_fiscal,
      itens,
      forma_pagamento,
      encargos,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ error: "codigo_loja e codigo_empresa são obrigatórios." });
    }

    if (forma_pagamento && Array.isArray(forma_pagamento)) {
      for (const pagamento of forma_pagamento) {
        if (!pagamento.meio_pagamento || !pagamento.valor_pagamento) {
          return res.status(400).json({
            error:
              "Cada forma de pagamento deve conter meio_pagamento e valor_pagamento.",
          });
        }
      }
    }

    const entradaAntiga = await Entrada.findOne({
      _id: id,
      codigo_loja,
      codigo_empresa,
    });

    if (!entradaAntiga) {
      return res
        .status(404)
        .json({ error: "Entrada não encontrada para essa loja e empresa." });
    }

    const updateData = {
      fornecedor,
      numero_nota_fiscal,
      itens,
      forma_pagamento,
      encargos,
      updated_at: new Date(),
    };

    Object.keys(updateData).forEach((key) => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const updatedEntrada = await Entrada.findOneAndUpdate(
      { _id: id, codigo_loja, codigo_empresa },
      updateData,
      { new: true, runValidators: true }
    ).populate("fornecedor", "razao_social nome_fantasia");

    if (itens && Array.isArray(itens)) {
      for (const itemAntigo of entradaAntiga.itens) {
        const produto = await Produto.findOne({
          codigo_produto: itemAntigo.codigo_produto,
          codigo_loja,
          codigo_empresa,
        });

        if (produto) {
          const quantidadeAnterior = Number(itemAntigo.quantidade) || 0;
          produto.estoque[0].estoque -= quantidadeAnterior;
          await produto.save();
        }
      }

      for (const item of itens) {
        const produto = await Produto.findOne({
          codigo_produto: item.codigo_produto,
          codigo_loja,
          codigo_empresa,
        });

        if (produto) {
          const quantidadeNova = Number(item.quantidade) || 0;
          produto.estoque[0].estoque += quantidadeNova;

          produto.precos = [
            {
              preco_compra: item.precos.preco_compra,
              cma: item.precos.cma,
              preco_venda: item.precos.preco_venda,
              preco_atacado: item.precos.preco_atacado,
              lucro_venda: item.precos.lucro_venda,
              lucro_atacado: item.precos.lucro_atacado,
              ultimos_precos: {
                ultimo_preco_compra: produto.precos[0]?.preco_compra || 0,
                ultimo_cma: produto.precos[0]?.cma || 0,
                ultimo_preco_venda: produto.precos[0]?.preco_venda || 0,
                ultimo_preco_atacado: produto.precos[0]?.preco_atacado || 0,
                ultimo_lucro_venda: produto.precos[0]?.lucro_venda || 0,
                ultimo_lucro_atacado: produto.precos[0]?.lucro_atacado || 0,
              },
            },
          ];

          if (encargos) {
            produto.encargos = [
              {
                ncm: item.ncm || produto.encargos[0]?.ncm,
                cest: encargos.cest || produto.encargos[0]?.cest || 0,
                icms: encargos.icms || produto.encargos[0]?.icms || 0,
                ipi: encargos.ipi || produto.encargos[0]?.ipi || 0,
                pis: encargos.pis || produto.encargos[0]?.pis || 0,
                cofins: encargos.cofins || produto.encargos[0]?.cofins || 0,
              },
            ];
          }

          await produto.save();
        }
      }
    }

    res.status(200).json({
      message: "Entrada atualizada com sucesso",
      entrada: updatedEntrada,
    });
  } catch (error) {
    console.error("Erro ao atualizar entrada:", error);
    res.status(500).json({ error: error.message });
  }
};
