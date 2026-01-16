const User = require('../models/user.model');

const authUser = async (req, res, next) => {
  const { user_id, permissao } = req.body;

  if (!user_id || !permissao) {
    return res.status(400).json({ message: 'Usuário ou permissão não fornecidos.' });
  }

  try {
    const user = await User.findById(user_id);

    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    // Verificar se as permissões existem
    if (!Array.isArray(user.permissions) || user.permissions.length === 0) {
      return res.status(403).json({
        message: 'Usuário não possui permissões configuradas.',
        detalhes: { usuario: user.name }
      });
    }

    // Função auxiliar para checar permissões
    const checkPermission = (permissions, permPath) => {
      // Remove 'permissao.' do início do path se existir
      const cleanPath = permPath.replace(/^permissao\./, '');
      const parts = cleanPath.split('.');;

      // Percorre o array de permissions
      for (const permGroup of permissions) {
        let current = permGroup.permissoes;

        // Percorre cada parte do caminho
        let isValid = true;
        for (const part of parts) {
          if (current && current[part] !== undefined) {
            current = current[part];
          } else {
            isValid = false;
            break;
          }
        }

        // Importante: agora verificamos explicitamente se o valor é true
        if (isValid && current === true) {
          return true;
        } else if (isValid) {
          return false;
        }
      }

      return false;
    };


    // Verifica a permissão específica
    const hasPermission = checkPermission(user.permissions, permissao);

    if (!hasPermission) {
      return res.status(403).json({
        message: `Permissão negada para '${permissao}'.`,
        detalhes: {
          usuario: user.name,
          permissao_requerida: permissao,
          tipo_usuario: user.type,
          valor_permissao: 'false' // Adicionado para debug
        }
      });
    }

    // Adiciona informações do usuário ao request para uso posterior
    req.userInfo = {
      userId: user._id,
      name: user.name,
      type: user.type
    };

    next();
  } catch (error) {
    console.error('Erro ao verificar permissões:', error);
    return res.status(500).json({
      message: 'Erro interno do servidor.',
      detalhes: error.message
    });
  }
};

module.exports = authUser;