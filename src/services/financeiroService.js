const mongoose = require("mongoose");
const ContasBancarias = require("../models/contas_bancarias.model");

async function atualizarSaldosContas(
  session,
  codigo_loja,
  codigo_empresa,
  formasPagamento,
  operacao
) {
  if (!formasPagamento || formasPagamento.length === 0) {
    return;
  }

  const contaBancariaPadrao = await ContasBancarias.findOne({
    codigo_loja,
    codigo_empresa,
    conta_padrao: true,
  }).session(session);

  for (const pagamento of formasPagamento) {
    const { meio_pagamento, valor_pagamento, dados_transferencia } = pagamento;
    const meio = meio_pagamento.toLowerCase().trim();
    let contaBancaria;

    if (meio === "pix") {
      contaBancaria = contaBancariaPadrao;
      if (!contaBancaria) {
        throw new Error(
          "Nenhuma conta bancária padrão encontrada para receber o PIX."
        );
      }
    } else if (meio === "transferencia") {
      if (!dados_transferencia || !dados_transferencia.codigo_conta_bancaria) {
        throw new Error("Dados da conta de transferência não fornecidos.");
      }
      contaBancaria = await ContasBancarias.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_conta_bancaria: dados_transferencia.codigo_conta_bancaria,
      }).session(session);
      if (!contaBancaria) {
        throw new Error(
          `Conta bancária para transferência (${dados_transferencia.codigo_conta_bancaria}) não encontrada.`
        );
      }
    }

    if (contaBancaria) {
      const valor = parseFloat(valor_pagamento);
      if (operacao === "adicionar") {
        contaBancaria.saldo = (contaBancaria.saldo || 0) + valor;
      } else if (operacao === "subtrair") {
        if ((contaBancaria.saldo || 0) < valor) {
          throw new Error(
            `Saldo insuficiente na conta ${contaBancaria.conta_bancaria} para realizar o estorno.`
          );
        }
        contaBancaria.saldo = (contaBancaria.saldo || 0) - valor;
      }
      await contaBancaria.save({ session });
    }
  }
}

module.exports = {
  atualizarSaldosContas,
};