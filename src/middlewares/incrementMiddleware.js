const mongoose = require('mongoose');

module.exports = async function incrementarCodigos(next) {
  const loja = this;

  // Incremento automático do `codigo_loja` se não estiver definido
  if (!loja.codigo_loja) {
    // Pegue o último código de loja e incremente 1
    const lastLoja = await mongoose.model('Loja').findOne().sort({ codigo_loja: -1 });
    loja.codigo_loja = lastLoja ? lastLoja.codigo_loja + 1 : 1;
  }

  // Incremento automático do `codigo_empresa` para cada nova empresa
  if (loja.empresas && loja.isModified('empresas')) {
    // Para cada empresa na loja
    for (let i = 0; i < loja.empresas.length; i++) {
      const empresa = loja.empresas[i];

      if (!empresa.codigo_empresa) {
        // Defina o código da empresa baseado no maior código existente na loja
        const maxCodigoEmpresa = loja.empresas.length > 0
          ? Math.max(...loja.empresas.map((emp) => emp.codigo_empresa || 0))
          : 0;
        
        empresa.codigo_empresa = maxCodigoEmpresa + 1;
      }

      // Verifique se o código da empresa já existe globalmente em outras lojas
      let empresaExistente = await mongoose.model('Loja').aggregate([
        { $unwind: "$empresas" },
        { $match: { "empresas.codigo_empresa": empresa.codigo_empresa } },
        { $limit: 1 } // Limita a um único resultado
      ]);

      // Se a empresa com o código já existir, incrementa o código até encontrar um disponível
      while (empresaExistente.length > 0) {
        empresa.codigo_empresa += 1;  // Incrementa o código
        empresaExistente = await mongoose.model('Loja').aggregate([
          { $unwind: "$empresas" },
          { $match: { "empresas.codigo_empresa": empresa.codigo_empresa } },
          { $limit: 1 } // Limita a um único resultado
        ]);
      }
    }
  }

  next();
};
