const LandingPage = require("../models/ladingPage.model");

exports.createLadingPage = async (req, res) => {
  const {
    codigo_loja,
    codigo_empresa,
    company_name,
    url,
    slogan,
    about,
    phone,
    whatsapp,
    email,
    hero_title,
    features,
    working_hours,
    address,
    social,
    location,
    price,
  } = req.body;

  const filtro = { codigo_loja, codigo_empresa };
  const existinglandingPage = await LandingPage.findOne(filtro);

  if (existinglandingPage) {
    console.error("Ja existe uma Landing Page");
    return res.status(400).json({
      error: "A Landing Page ja existe",
    });
  }

  if (!codigo_loja || !codigo_empresa) {
    console.error("Faltando codigo_loja ou codigo_empresa");
    return res.status(400).json({
      error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
    });
  }

  if (!company_name) {
    console.error("Faltando company_name");
    return res.status(400).json({
      error: "O campo company_name é obrigatório.",
    });
  }

  if (!url) {
    console.error("Faltando url");
    return res.status(400).json({
      error: "O campo url é obrigatório.",
    });
  }
  if (!slogan) {
    console.error("Faltando slogan");
    return res.status(400).json({
      error: "O campo slogan é obrigatório.",
    });
  }
  if (!about) {
    console.error("Faltando about");
    return res.status(400).json({
      error: "O campo about é obrigatório.",
    });
  }
  if (!phone) {
    console.error("Faltando phone");
    return res.status(400).json({
      error: "O campo phone é obrigatório.",
    });
  }
  if (!whatsapp) {
    console.error("Faltando whatsapp");
    return res.status(400).json({
      error: "O campo whatsapp é obrigatório.",
    });
  }
  if (!email) {
    console.error("Faltando email");
    return res.status(400).json({
      error: "O campo email é obrigatório.",
    });
  }
  if (!hero_title) {
    console.error("Faltando hero_title");
    return res.status(400).json({
      error: "O campo hero_title é obrigatório.",
    });
  }
  if (!features) {
    console.error("Faltando features");
    return res.status(400).json({
      error: "O campo features é obrigatório.",
    });
  }
  if (!working_hours) {
    console.error("Faltando working_hours");
    return res.status(400).json({
      error: "O campo working_hours é obrigatório.",
    });
  }
  if (!address) {
    console.error("Faltando address");
    return res.status(400).json({
      error: "O campo address é obrigatório.",
    });
  }
  if (!social) {
    console.error("Faltando social");
    return res.status(400).json({
      error: "O campo social é obrigatório.",
    });
  }
  if (!location) {
    console.error("Faltando location");
    return res.status(400).json({
      error: "O campo location é obrigatório.",
    });
  }
  if (!price) {
    console.error("Faltando price");
    return res.status(400).json({
      error: "O campo price é obrigatório.",
    });
  }

  try {
    const newLandingPage = new LandingPage({
      codigo_loja,
      codigo_empresa,
      company_name,
      url,
      slogan,
      about,
      phone,
      whatsapp,
      email,
      hero_title,
      features,
      working_hours,
      address,
      social,
      location,
      price,
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

exports.getLandingPageByUrl = async (req, res) => {
  const { url } = req.query;

  if (!url) {
    console.error("Faltando url");
    return res.status(400).json({
      error: "A url é obrigatória.",
    });
  }

  try {
    const filtro = { url };

    const landing_page = await LandingPage.findOne(filtro);

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

exports.getLandingPageByEnterprise = async (req, res) => {
  const { codigo_loja, codigo_empresa } = req.query;

  if (!codigo_loja || !codigo_empresa) {
    console.error("Faltando codigo_loja ou codigo_empresa");
    return res.status(400).json({
      error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
    });
  }

  try {
    const filtro = { codigo_loja, codigo_empresa };

    const existinglandingPage = await LandingPage.find(filtro);

    res.status(200).json(existinglandingPage);
  } catch (error) {
    res.status(500).json({
      error: "Erro interno do servidor",
      message: "Não foi possível buscar a empresa",
    });
  }
};

exports.updateLandingPage = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!id) {
    console.error("Faltando id");
    return res.status(400).json({
      error: "O id é obrigatório.",
    });
  }

  try {
    const updatedLandingPage = await LandingPage.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedLandingPage) {
      return res.status(404).json({
        error: "Landing Page não encontrada",
      });
    }
    res.status(200).json({
      message: "Landing Page atualizada com sucesso",
      landing_page: updatedLandingPage,
    });
  } catch (error) {
    res.status(500).json({
      error: "Erro interno do servidor",
      details: error.message,
    });
  }
};
