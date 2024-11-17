const Loja = require('../models/lojas.model');

// Criar uma nova loja com uma empresa
exports.createLoja = async (req, res) => {
  try {
    const { lojasNome, empresas } = req.body;

    const novaLoja = new Loja({ lojasNome, empresas });

    await novaLoja.save();

    res.status(201).json(novaLoja);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obter todas as lojas
exports.getLojas = async (req, res) => {
  try {
    const lojas = await Loja.find();
    res.status(200).json(lojas);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Adicionar uma nova empresa a uma loja existente
exports.addEmpresaToLoja = async (req, res) => {
  const { lojaId } = req.params;
  const novaEmpresa = req.body;

  try {
    const loja = await Loja.findById(lojaId);
    if (!loja) return res.status(404).json({ message: 'Loja não encontrada' });

    loja.empresas.push(novaEmpresa);
    await loja.save();
    res.status(201).json(loja);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
