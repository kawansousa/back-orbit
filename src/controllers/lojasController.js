const { body, validationResult } = require("express-validator");
const Loja = require("../models/lojas.model");
const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const { Role, ALL_PERMISSIONS } = require("../models/role.model");

exports.createLoja = async (req, res) => {
  const validations = [
    body("codigo_loja")
      .trim()
      .notEmpty()
      .withMessage("Código da loja é obrigatório")
      .custom(async (value) => {
        const lojaExistente = await Loja.findOne({ codigo_loja: value });
        if (lojaExistente) {
          throw new Error("Código da loja já está em uso");
        }
        return true;
      }),
    body("lojasNome")
      .trim()
      .notEmpty()
      .withMessage("Nome da loja é obrigatório")
      .isLength({ min: 3, max: 100 })
      .withMessage("Nome da loja deve ter entre 3 e 100 caracteres"),

    body("responsavel")
      .trim()
      .notEmpty()
      .withMessage("Nome do responsável é obrigatório")
      .isLength({ min: 3, max: 80 })
      .withMessage("Nome do responsável deve ter entre 3 e 80 caracteres"),

    body("fone_responsavel")
      .trim()
      .notEmpty()
      .withMessage("Telefone do responsável é obrigatório")
      .matches(
        /^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?9?[0-9]{4}-?[0-9]{4}$|^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?[2-5][0-9]{3}-?[0-9]{4}$/
      )
      .withMessage(
        "Formato de telefone inválido (ex: (11) 99999-9999 ou (11) 3333-4444)"
      ),

    body("empresas")
      .isArray({ min: 1 })
      .withMessage("Pelo menos uma empresa deve ser associada à loja"),

    body("empresas.*.razao")
      .trim()
      .notEmpty()
      .withMessage("Razão social da empresa é obrigatória")
      .isLength({ min: 3, max: 150 })
      .withMessage("Razão social deve ter entre 3 e 150 caracteres")
      .custom(async (value, { req }) => {
        const EmpresaExistente = await Loja.findOne({
          "empresas.razao": value
        })
        if (EmpresaExistente) {
          throw new Error("Empresa com essa razão social ja cadastrada")
        }
        return
      }),

    body("empresas.*.nomeFantasia")
      .trim()
      .notEmpty()
      .withMessage("Nome fantasia da empresa é obrigatório")
      .isLength({ min: 3, max: 100 })
      .withMessage("Nome fantasia deve ter entre 3 e 100 caracteres")
      .custom(async (value, { req }) => {
        const EmpresaExistente = await Loja.findOne({
          "empresas.nomeFantasia": value
        })
        if (EmpresaExistente) {
          throw new Error("Empresa com esse nome fantasia ja cadastrada")
        }
      }),

    body("empresas.*.cnpj")
      .trim()
      .notEmpty()
      .withMessage("CNPJ da empresa é obrigatório")
      .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$|^\d{14}$/)
      .withMessage(
        "CNPJ deve estar no formato 00.000.000/0000-00 ou apenas números"
      )
      .custom(async (value) => {
        const cnpj = value.replace(/[^\d]/g, "");
        if (cnpj.length !== 14) return false;
        if (/^(\d)\1+$/.test(cnpj)) return false;

        const cnpjExistente = await Loja.findOne({
          "empresas.cnpj": value,
        });

        if (cnpjExistente) {
          throw new Error("CNPJ já está cadastrado no sistema");
        }

        return true;
      })
      .withMessage("CNPJ inválido ou já está em uso"),

    body("empresas.*.inscricaoEstadual")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 20 })
      .withMessage("Inscrição estadual deve ter no máximo 20 caracteres"),

    body("empresas.*.inscricaoMunicipal")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 20 })
      .withMessage("Inscrição municipal deve ter no máximo 20 caracteres"),

    body("empresas.*.fone")
      .optional({ checkFalsy: true })
      .trim()
      .matches(
        /^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?9?[0-9]{4}-?[0-9]{4}$|^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?[2-5][0-9]{3}-?[0-9]{4}$/
      )
      .withMessage("Formato de telefone da empresa inválido"),

    body("empresas.*.fone_secundario")
      .optional({ checkFalsy: true })
      .trim()
      .matches(
        /^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?9?[0-9]{4}-?[0-9]{4}$|^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?[2-5][0-9]{3}-?[0-9]{4}$/
      )
      .withMessage("Formato de telefone secundário da empresa inválido"),

    body("empresas.*.email")
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage("Email da empresa deve ter um formato válido")
      .normalizeEmail(),

    body("empresas.*.endereco.logradouro")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage("Logradouro deve ter no máximo 100 caracteres"),

    body("empresas.*.endereco.numero")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 10 })
      .withMessage("Número deve ter no máximo 10 caracteres"),

    body("empresas.*.endereco.bairro")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Bairro deve ter no máximo 50 caracteres"),

    body("empresas.*.endereco.cidade")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Cidade deve ter no máximo 50 caracteres"),

    body("empresas.*.endereco.estado")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage("Estado deve ter exatamente 2 caracteres"),

    body("empresas.*.endereco.cep")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{5}-?\d{3}$/)
      .withMessage("CEP deve estar no formato 00000-000 ou 00000000"),

    body("empresas.*.logo")
      .optional({ checkFalsy: true })
      .trim()
      .isURL()
      .withMessage("Logo deve ser uma URL válida"),

    body("empresas.*.rodape")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage("Rodapé deve ter no máximo 500 caracteres"),

    body("email")
      .trim()
      .notEmpty()
      .withMessage("Email é obrigatório")
      .isEmail()
      .withMessage("Email deve ter um formato válido")
      .normalizeEmail()
      .custom(async (value) => {
        const userExistente = await User.findOne({ email: value });
        if (userExistente)
          throw new Error("Email já está cadastrado no sistema");
        return true;
      }),
    body("password")
      .isLength({ min: 8 })
      .withMessage("Senha deve ter no mínimo 8 caracteres"),
  ];

  await Promise.all(validations.map((validation) => validation.run(req)));
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res
      .status(400)
      .json({ error: "Dados inválidos", details: errors.array() });
  }

  const {
    codigo_loja,
    lojasNome,
    responsavel,
    fone_responsavel,
    empresas,
    email,
    password,
  } = req.body;

  try {
    const novaLoja = new Loja({
      codigo_loja,
      lojasNome,
      responsavel,
      fone_responsavel,
      empresas,
    });
    await novaLoja.save();

    const acessoLoja = novaLoja.empresas.map((empresa) => ({
      codigo_loja: novaLoja.codigo_loja,
      codigo_empresas: {
        codigo: empresa.codigo_empresa,
        nome: empresa.nomeFantasia,
      },
    }));

    const primeiraEmpresa = empresas[0];

    let adminRole = await Role.findOne({
      name: "Administrador",
      codigo_loja: codigo_loja,
    });

    if (!adminRole) {
      adminRole = new Role({
        name: "Administrador",
        description: "Acesso total ao sistema.",
        permissions: ALL_PERMISSIONS,
        codigo_loja: codigo_loja,
        codigo_empresa: primeiraEmpresa.codigo_empresa,
      });
      await adminRole.save();
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const usuarioCriado = new User({
      name: responsavel,
      email,
      password: hashedPassword,
      acesso_loja: acessoLoja,
      role: adminRole._id,
      status: "ativo",
    });

    await usuarioCriado.save();

    const { password: _, ...usuarioSemSenha } = usuarioCriado.toObject();

    res.status(201).json({
      message: "Loja e usuário criados com sucesso!",
      loja: novaLoja,
      usuario: usuarioSemSenha,
    });
  } catch (error) {
    console.error("Erro ao criar loja:", error);
    res.status(500).json({ error: "Erro interno ao criar loja." });
  }
};

exports.createEmpresa = async (req, res) => {
  const validations = [
    body("codigo_loja")
      .trim()
      .notEmpty()
      .withMessage("Código da loja é obrigatório")
      .isInt({ min: 1 })
      .withMessage("Código da loja deve ser um número inteiro positivo")
      .custom(async (value) => {
        const lojaExistente = await Loja.findOne({
          codigo_loja: parseInt(value),
        });
        if (!lojaExistente) {
          throw new Error("Loja não encontrada");
        }
        return true;
      }),

    body("razao")
      .trim()
      .notEmpty()
      .withMessage("Razão social da empresa é obrigatória")
      .isLength({ min: 3, max: 150 })
      .withMessage("Razão social deve ter entre 3 e 150 caracteres")
      .custom(async (value) => {
        const empresaExistente = await Loja.findOne({
          "empresas.razao": value,
        });
        if (empresaExistente) {
          throw new Error("Empresa com essa razão social ja cadastrada");
        }
        return true;
      }),

    body("nomeFantasia")
      .trim()
      .notEmpty()
      .withMessage("Nome fantasia da empresa é obrigatório")
      .isLength({ min: 3, max: 100 })
      .withMessage("Nome fantasia deve ter entre 3 e 100 caracteres")
      .custom(async (value) => {
        const empresaExistente = await Loja.findOne({
          "empresas.nomeFantasia": value,
        });
        if (empresaExistente) {
          throw new Error("Empresa com esse nome fantasia ja cadastrada");
        }
        return true;
      }),

    body("cnpj")
      .trim()
      .notEmpty()
      .withMessage("CNPJ da empresa é obrigatório")
      .matches(/^\d{2}\.\d{3}\.\d{3}\/\d{4}\-\d{2}$|^\d{14}$/)
      .withMessage(
        "CNPJ deve estar no formato 00.000.000/0000-00 ou apenas números"
      )
      .custom(async (value) => {
        const cnpj = value.replace(/[^\d]/g, "");
        if (cnpj.length !== 14) return false;
        if (/^(\d)\1+$/.test(cnpj)) return false;

        const cnpjExistente = await Loja.findOne({
          "empresas.cnpj": value,
        });

        if (cnpjExistente) {
          throw new Error("CNPJ já está cadastrado no sistema");
        }

        return true;
      })
      .withMessage("CNPJ inválido ou já está em uso"),

    body("inscricaoEstadual")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 20 })
      .withMessage("Inscrição estadual deve ter no máximo 20 caracteres"),

    body("inscricaoMunicipal")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 20 })
      .withMessage("Inscrição municipal deve ter no máximo 20 caracteres"),

    body("fone")
      .optional({ checkFalsy: true })
      .trim()
      .matches(
        /^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?9?[0-9]{4}-?[0-9]{4}$|^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?[2-5][0-9]{3}-?[0-9]{4}$/
      )
      .withMessage("Formato de telefone da empresa inválido"),

    body("fone_secundario")
      .optional({ checkFalsy: true })
      .trim()
      .matches(
        /^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?9?[0-9]{4}-?[0-9]{4}$|^(?:\+55\s?)?\(?[1-9][1-9]\)?\s?[2-5][0-9]{3}-?[0-9]{4}$/
      )
      .withMessage("Formato de telefone secundário da empresa inválido"),

    body("email")
      .optional({ checkFalsy: true })
      .trim()
      .isEmail()
      .withMessage("Email da empresa deve ter um formato válido")
      .normalizeEmail(),

    body("endereco.logradouro")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 100 })
      .withMessage("Logradouro deve ter no máximo 100 caracteres"),

    body("endereco.numero")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 10 })
      .withMessage("Número deve ter no máximo 10 caracteres"),

    body("endereco.bairro")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Bairro deve ter no máximo 50 caracteres"),

    body("endereco.cidade")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 50 })
      .withMessage("Cidade deve ter no máximo 50 caracteres"),

    body("endereco.estado")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ min: 2, max: 2 })
      .withMessage("Estado deve ter exatamente 2 caracteres"),

    body("endereco.cep")
      .optional({ checkFalsy: true })
      .trim()
      .matches(/^\d{5}-?\d{3}$/)
      .withMessage("CEP deve estar no formato 00000-000 ou 00000000"),

    body("logo")
      .optional({ checkFalsy: true })
      .trim()
      .isURL()
      .withMessage("Logo deve ser uma URL válida"),

    body("rodape")
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 })
      .withMessage("Rodapé deve ter no máximo 500 caracteres"),
  ];

  await Promise.all(validations.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: "Dados inválidos",
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  const {
    codigo_loja,
    razao,
    nomeFantasia,
    cnpj,
    inscricaoEstadual,
    inscricaoMunicipal,
    fone,
    fone_secundario,
    email,
    endereco,
    logo,
    rodape,
  } = req.body;

  try {
    const loja = await Loja.findOne({ codigo_loja: parseInt(codigo_loja) });

    if (!loja) {
      return res.status(404).json({ error: "Loja não encontrada" });
    }

    const codigo_empresa = req.body.codigo_empresa;
    const novaEmpresa = {
      codigo_empresa,
      razao,
      nomeFantasia,
      cnpj,
      inscricaoEstadual,
      inscricaoMunicipal,
      fone,
      fone_secundario,
      email,
      endereco,
      logo,
      rodape,
    };

    loja.empresas.push(novaEmpresa);
    await loja.save();

    const novoAcesso = {
      codigo_loja: codigo_loja,
      codigo_empresas: {
        codigo: codigo_empresa,
        nome: nomeFantasia,
      },
    };

    const adminRole = await Role.findOne({
      name: "Administrador",
      codigo_loja: codigo_loja,
    });

    if (adminRole) {
      await User.updateMany(
        {
          "acesso_loja.codigo_loja": codigo_loja,
          role: adminRole._id,
        },
        {
          $push: { acesso_loja: novoAcesso },
        }
      );
    }

    res.status(201).json({
      message: "Empresa criada com sucesso!",
      empresa: novaEmpresa,
    });
  } catch (error) {
    console.error("Erro ao criar empresa:", error);
    res.status(500).json({ error: "Erro interno do servidor" });
  }
};
exports.getEmpresaByLoja = async (req, res) => {
  try {
    const { codigo_loja, empresaId } = req.query;

    if (!codigo_loja || !empresaId) {
      return res.status(400).json({
        error: "Parâmetros inválidos",
        message: "É necessário informar codigo_loja e empresaId",
      });
    }

    const loja = await Loja.findOne({ codigo_loja: parseInt(codigo_loja) });

    if (!loja) {
      return res.status(404).json({
        error: "Loja não encontrada",
        message: "Nenhuma loja encontrada com esse código",
      });
    }

    const empresa = loja.empresas.id(empresaId);

    if (!empresa) {
      return res.status(404).json({
        error: "Empresa não encontrada",
        message: "Nenhuma empresa encontrada com esse ID nessa loja",
      });
    }

    res.json(empresa);
  } catch (error) {
    console.error("Erro ao buscar empresa da loja:", error);
    res.status(500).json({
      error: "Erro interno do servidor",
      message: "Não foi possível buscar a empresa",
    });
  }
};