const { body, validationResult } = require("express-validator");
const { cpf, cnpj } = require("cpf-cnpj-validator");
const Cliente = require("../models/clientes.model");

const autoIncrementCliente = [
  body("tipo")
    .notEmpty()
    .withMessage("O tipo de cliente é obrigatório.")
    .isString()
    .withMessage("O tipo deve ser uma string."),

  body("email")
    .optional()
    .custom((value) => {
      if (!value) return true;
      const validator = require("validator");
      if (!validator.isEmail(value)) {
        throw new Error("Email inválido.");
      }
      return true;
    }),

  body("cpf")
    .optional()
    .custom((value) => {
      if (!value || value.toLowerCase() === "nao informado") return true;
      if (!cpf.isValid(value)) {
        throw new Error("CPF inválido.");
      }
      return true;
    }),

  body("cnpj")
    .optional()
    .custom((value) => {
      if (!value || value.toLowerCase() === "nao informado") return true;
      if (!cnpj.isValid(value)) {
        throw new Error("CNPJ inválido.");
      }
      return true;
    }),

  body("fone")
    .optional()
    .isString()
    .withMessage("O telefone deve ser uma string."),

  body("endereco")
    .optional()
    .isObject()
    .withMessage("O endereço deve ser um objeto."),

  body("endereco.cep")
    .optional()
    .isString()
    .withMessage("O CEP deve ser uma string."),

  body("conjugue")
    .optional()
    .isObject()
    .withMessage("O conjugue deve ser um objeto."),
  async (req, res, next) => {
    try {
      // Verifica erros de validação
      const erros = validationResult(req);
      if (!erros.isEmpty()) {
        return res.status(400).json({ erros: erros.array() });
      }

      const { codigo_empresa, codigo_loja } = req.body;

      // Buscar último código de cliente para a loja + empresa
      const lastCliente = await Cliente.findOne({
        codigo_loja,
        codigo_empresa,
      }).sort({ codigo_cliente: -1 });

      // Próximo código de cliente
      const nextCodigoCliente = lastCliente
        ? lastCliente.codigo_cliente + 1
        : 1;

      // Adiciona no body
      req.body.codigo_cliente = nextCodigoCliente;

      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
];

module.exports = autoIncrementCliente;
