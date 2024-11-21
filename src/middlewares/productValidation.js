const mongoose = require('mongoose');

module.exports = async function incrementarCodigoProduto(next) {
  const produto = this;

  // Obtém o código da loja atual (usando codigo_loja em vez de lojasNome)
  const codigoLojaAtual = produto.codigo_loja;

  // Incremento automático do `codigo_produto`
  if (!produto.codigo_produto) {
    const lastProduto = await mongoose
      .model('Produto')
      .findOne({ codigo_loja: codigoLojaAtual })  // Usando codigo_loja aqui
      .sort({ codigo_produto: -1 });  // Ordenando por codigo_produto de forma decrescente

    // Se existir um produto, incrementa o codigo_produto, caso contrário, começa com 1
    produto.codigo_produto = lastProduto ? lastProduto.codigo_produto + 1 : 1;
  }

  next();
};
