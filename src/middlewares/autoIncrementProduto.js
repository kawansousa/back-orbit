const { body, validationResult } = require("express-validator");
const Produto = require("../models/produtos.model");

const autoIncrementProduto = [
  body("descricao")
    .notEmpty()
    .withMessage("A descrição do produto é obrigatória.")
    .isString()
    .withMessage("A descrição deve ser uma string."),

  body("status")
    .optional()
    .isIn(["ativo", "inativo"])
    .withMessage("Status inválido."),

  body("precos")
    .isArray()
    .withMessage("Preços devem ser enviados em um array."),
  body("precos.*.preco_compra")
    .notEmpty()
    .withMessage("Preço de compra é obrigatório.")
    .isFloat({ min: 0 }),
  body("precos.*.cma")
    .notEmpty()
    .withMessage("CMA é obrigatório.")
    .isFloat({ min: 0 }),
  body("precos.*.preco_venda")
    .notEmpty()
    .withMessage("Preço de venda é obrigatório.")
    .isFloat({ min: 0 }),
  body("precos.*.lucro_venda")
    .notEmpty()
    .withMessage("Lucro de venda é obrigatório.")
    .isFloat({ min: 0 }),
  body("precos.*.preco_atacado")
    .notEmpty()
    .withMessage("Preço de atacado é obrigatório.")
    .isFloat({ min: 0 }),
  body("precos.*.lucro_atacado")
    .notEmpty()
    .withMessage("Lucro de atacado é obrigatório.")
    .isFloat({ min: 0 }),

  body("estoque")
    .optional()
    .isArray()
    .withMessage("Estoque deve ser enviado em um array."),
  body("estoque.*.unidade")
    .notEmpty()
    .withMessage("Unidade é obrigatória.")
    .isIn(["UN", "KG", "L", "CX", "PCT", "SC", "TON"])
    .withMessage("Unidade inválida."),

  // ----------------------
  // Lógica original de incremento + código de barras
  // ----------------------
  async (req, res, next) => {
    try {
      // Verifica erros de validação
      const erros = validationResult(req);
      if (!erros.isEmpty()) {
        return res.status(400).json({ erros: erros.array() });
      }

      const { codigo_loja, codigo_empresa } = req.body;

      // Buscar o último código de produto para a loja e empresa
      const lastProduct = await Produto.findOne({
        codigo_loja,
        codigo_empresa,
      }).sort({ codigo_produto: -1 });

      // Definir o próximo código
      const nextCodigoProduto = lastProduct
        ? lastProduct.codigo_produto + 1
        : 1;

      // Gerar o código de barras automaticamente se não for passado
      const codigoBarras =
        req.body.codigo_barras ||
        `${codigo_loja}${codigo_empresa}${String(nextCodigoProduto).padStart(
          12,
          "0"
        )}`;

      // Adicionar os códigos no request body
      req.body.codigo_produto = nextCodigoProduto;
      req.body.codigo_barras = codigoBarras;

      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = autoIncrementProduto;
