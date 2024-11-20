const mongoose = require('mongoose');

module.exports = async function incrementarCodigos(next) {
  const loja = this;

  // Incremento automático do `codigo_loja` se não estiver definido
  if (!loja.codigo_loja) {
    // Obter o último código de loja e incrementar
    const lastLoja = await mongoose.model('Loja').findOne().sort({ codigo_loja: -1 });
    loja.codigo_loja = lastLoja ? lastLoja.codigo_loja + 1 : 1;
  }

  // Incremento automático do `codigo_empresa` para cada empresa dentro da loja
  if (loja.empresas && loja.isModified('empresas')) {
    // Atribuindo o código sequencial de empresa dentro da loja
    for (let i = 0; i < loja.empresas.length; i++) {
      const empresa = loja.empresas[i];

      // Atribui um código sequencial para a empresa dentro da loja (começando do 1)
      empresa.codigo_empresa = i + 1;  // O código começa de 1 para a primeira empresa
    }
  }

  next();
};
