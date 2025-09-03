const Grupos = require("../models/grupos.model");
const { body, validationResult } = require("express-validator");

exports.createGrupos = async (req, res) => {
  const validations = [
    body("codigo_loja")
      .notEmpty()
      .withMessage('O campo "codigo_loja" é obrigatório'),
    body("codigo_empresa")
      .notEmpty()
      .withMessage('O campo "codigo_empresa" é obrigatório'),
    body("codigo_grupo")
      .notEmpty()
      .withMessage('O campo "codigo_grupo" é obrigatório'),
    body("descricao")
      .notEmpty()
      .withMessage('O campo "descricao" é obrigatório')
      .custom(async (value, { req }) => {
        const { codigo_loja, codigo_empresa } = req.body;

        const query = {
          descricao: value,
          codigo_loja: codigo_loja,
          codigo_empresa: codigo_empresa,
        };
        const grupoExistente = await Grupos.findOne(query);

        if (grupoExistente) {
          throw new Error("Grupo com essa descrição ja cadastrado");
        }
        return true;
      }),
    body("status").notEmpty().withMessage('O campo "status" é obrigatório'),
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

  try {
    const { codigo_loja, codigo_empresa, codigo_grupo, descricao, status } =
      req.body;

    const grupo = new Grupos({
      codigo_loja,
      codigo_empresa,
      codigo_grupo,
      descricao,
      status,
    });

    await grupo.save();
    res.status(201).json(grupo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getGrupos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit, searchTerm, searchType } =
      req.query;

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

    if (searchTerm && searchTerm.trim() !== "") {
      const termoBusca = searchTerm.trim();

      if (searchType === "todos") {
        const conditions = [];

        if (!isNaN(termoBusca)) {
          conditions.push({ codigo_grupo: parseInt(termoBusca, 10) });
        }

        conditions.push({ descricao: { $regex: termoBusca, $options: "i" } });

        filtros.$or = conditions;
      } else {
        switch (searchType) {
          case "codigo_grupo":
            if (!isNaN(termoBusca)) {
              filtros[searchType] = parseInt(termoBusca, 10);
            } else {
              filtros[searchType] = -1;
            }
            break;
          case "descrição":
            filtros[searchType] = { $regex: termoBusca, $options: "i" };
            break;
          default:
            return res.status(400).json({
              error:
                "Tipo de busca inválido. Use: todos, descricao ou codigo_grupo",
            });
        }
      }
    }

    const grupos = await Grupos.find(filtros).skip(skip).limit(limitNumber);
    const totalGrupos = await Grupos.countDocuments(filtros);

    res.status(200).json({
      total: totalGrupos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalGrupos / limitNumber),
      data: grupos,
    });
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    res.status(500).json({
      error: "Erro interno do servidor ao buscar grupos.",
      message: error.message,
    });
  }
};

exports.getGruposAtivos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, status, page, limit } = req.query;

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
      status: "ativo",
    };

    const grupos = await Grupos.find(filtros).skip(skip).limit(limitNumber);
    const totalGrupos = await Grupos.countDocuments(filtros);

    res.status(200).json({
      total: totalGrupos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalGrupos / limitNumber),
      data: grupos,
    });
  } catch (error) {
    console.error("Erro ao buscar grupos:", error);
    res.status(500).json({
      error: "Erro interno do servidor ao buscar grupos.",
      message: error.message,
    });
  }
};

exports.updateGrupos = async (req, res) => {
  const validations = [
    body("codigo_loja")
      .notEmpty()
      .withMessage('O campo "codigo_loja" é obrigatório'),
    body("codigo_empresa")
      .notEmpty()
      .withMessage('O campo "codigo_empresa" é obrigatório'),
    body("descricao")
      .notEmpty()
      .withMessage('O campo "descricao" é obrigatório')
      .custom(async (value) => {
        const grupoExistente = await Grupos.findOne({ descricao: value });
        if (grupoExistente) {
          throw new Error("Grupo com essa descrição ja cadastrado");
        }
        return true;
      }),
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

  try {
    const { codigo_loja, codigo_empresa, descricao } = req.body;

    const updateGrupos = await Grupos.findOneAndUpdate(
      { codigo_grupo: req.params.id, codigo_loja, codigo_empresa },
      { descricao },
      { new: true }
    );

    res.status(200).json({
      message: "Grupo atualizado",
      grupo: updateGrupos,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.canceledGrupo = async (req, res) => {
  const validations = [
    body("codigo_grupo")
      .notEmpty()
      .withMessage('O campo "codigo_grupo" é obrigatório'),
    body("codigo_loja")
      .notEmpty()
      .withMessage('O campo "codigo_loja" é obrigatório'),
    body("codigo_empresa")
      .notEmpty()
      .withMessage('O campo "codigo_empresa" é obrigatório'),
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
  try {
    const { codigo_loja, codigo_empresa, codigo_grupo } = req.body;

    const canceledGrupo = await Grupos.findOneAndUpdate(
      { codigo_grupo, codigo_loja, codigo_empresa },
      { status: "cancelado" },
      { new: true }
    );

    res.status(200).json({
      message: "Status de grupo atualizado para cancelado",
      grupo: canceledGrupo,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
