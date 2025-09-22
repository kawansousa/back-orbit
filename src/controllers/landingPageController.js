const LandingPage = require("../models/ladingPage.model");

exports.createLadingPage = async (req, res) => {
  const {
    codigo_loja,
    codigo_empresa,
    banner,
    numero_whatsapp,
    numero_telefone,
    horario_funcionamento,
    mensagem_footer,
    endereco,
    instagram,
    facebook,
    localizacao,
  } = req.body;

  try {
    const newLandingPage = new LandingPage({
      codigo_loja,
      codigo_empresa,
      banner,
      numero_whatsapp,
      numero_telefone,
      horario_funcionamento,
      mensagem_footer,
      endereco,
      instagram,
      facebook,
      localizacao,
    });
    await newLandingPage.save();

    res.status(201).json({
      message: "Landing Page criada",
      landing_page: newLandingPage,
    });
  } catch (error) {
    res.status(500).json({
      error: "Error no servidor",
      error,
    });
  }
};

exports.getLandingPage = async (req, res) => {
  const { codigo_loja, codigo_empresa } = req.query;

  try {
    const filtros = { codigo_loja, codigo_empresa };

    const landing_page = await LandingPage.findOne(filtros);

    res.status(200).json({
      landing_page,
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro interno do servidor",
      message: "Não foi possível buscar a empresa",
    });
  }
};
