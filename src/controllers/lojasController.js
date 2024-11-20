const Loja = require('../models/lojas.model');
const User = require('../models/user.model');


exports.createLoja = async (req, res) => {
  const { lojasNome, responsavel, fone_responsavel, empresas, userId } = req.body;

  try {
    // Criar a nova loja
    const novaLoja = new Loja({
      lojasNome,
      responsavel,
      fone_responsavel,
      empresas
    });

    // Salvar a loja no banco de dados
    await novaLoja.save();

    // Assumindo que o primeiro código de empresa seja o que você deseja associar ao usuário
    const codigoLoja = novaLoja.codigo_loja;
    const codigoEmpresa = novaLoja.empresas[0].codigo_empresa;

    // Atualizar o usuário, associando-o à loja e à empresa
    const user = await User.findById(userId);
    if (user) {
      user.acesso_loja.push({
        codigo_loja: codigoLoja,
        codigo_empresas: {
          codigo: codigoEmpresa,
          nome: lojasNome,
        },
      });

      // Salvar as alterações no usuário
      await user.save();
    }

    // Retornar a loja criada e as informações do usuário atualizado
    res.status(201).json({
      loja: novaLoja,
      user: user ? user : null
    });
    
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
