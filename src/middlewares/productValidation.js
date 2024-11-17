const mongoose = require('mongoose');

module.exports = async function incrementarCodigoProduto(next) {
  const produto = this;

  // Obtém o nome da loja atual
  const lojaAtual = produto.lojasNome;

  // Incremento automático do `codigo_produto`
  if (!produto.codigo_produto) {
    const lastProduto = await mongoose
      .model('Produto')
      .findOne({ lojasNome: lojaAtual })
      .sort({ codigo_produto: -1 });

    produto.codigo_produto = lastProduto ? lastProduto.codigo_produto + 1 : 1;
  }

  next();
};
