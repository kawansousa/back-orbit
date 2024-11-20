const Loja = require('../models/lojas.model');
const User = require('../models/user.model');


exports.createLoja = async (req, res) => {
  const { lojasNome, responsavel, fone_responsavel, empresas, userId } = req.body;

  // Criar a nova loja
  const novaLoja = new Loja({
    lojasNome,
    responsavel,
    fone_responsavel,
    empresas // Empresas já têm o código atribuído no middleware
  });

  try {
    // Antes de salvar, atribuir os códigos das empresas (em caso de não ter sido feito no middleware)
    empresas.forEach((empresa, index) => {
      empresa.codigo_empresa = index + 1; // Gerar código sequencial para cada empresa dentro da loja
    });

    // Salvar a loja no banco de dados
    await novaLoja.save();

    // Obter o código da loja
    const codigoLoja = novaLoja.codigo_loja;

    // Atualizar o usuário, associando-o à loja e às empresas
    const user = await User.findById(userId);
    if (user) {
      // Iterar sobre o array de empresas e adicionar informações ao campo acesso_loja do usuário
      empresas.forEach(empresa => {
        user.acesso_loja.push({
          codigo_loja: codigoLoja,
          codigo_empresas: {
            codigo: empresa.codigo_empresa,  // Usar o código gerado manualmente
            nome: empresa.nomeFantasia,      // Nome da empresa
          },
        });
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
