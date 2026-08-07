const Movimentacao = require('../models/movimentacoes_caixa.model');
const ContasBancarias = require('../models/contas_bancarias.model');
const logger = require('../utils/logger');

/**
 * Calcula os totais por meio de pagamento a partir de um array de formas de pagamento.
 * @param {Array} formasPagamento
 * @returns {{ totalDinheiro: number, totalPix: number, totalTransferencia: number, transferenciasDetalhadas: Array }}
 */
function calcularTotaisPorMeio(formasPagamento) {
  let totalDinheiro = 0;
  let totalPix = 0;
  let totalTransferencia = 0;
  const transferenciasDetalhadas = [];

  (formasPagamento || []).forEach((pagamento) => {
    const meio = pagamento.meio_pagamento.toLowerCase().trim();
    const valor = parseFloat(pagamento.valor_pagamento);

    if (meio === 'dinheiro') {
      totalDinheiro += valor;
    } else if (meio === 'pix') {
      totalPix += valor;
    } else if (meio === 'transferencia') {
      totalTransferencia += valor;
      transferenciasDetalhadas.push({
        valor,
        codigo_conta_bancaria: pagamento.dados_transferencia.codigo_conta_bancaria,
      });
    }
  });

  return { totalDinheiro, totalPix, totalTransferencia, transferenciasDetalhadas };
}

/**
 * Atualiza o saldo do caixa com base nas formas de pagamento em dinheiro.
 * @param {Object} caixa - Documento do caixa
 * @param {Array} formasPagamento
 * @param {'adicionar'|'subtrair'} operacao
 * @returns {number} Total em dinheiro processado
 */
function atualizarSaldoCaixa(caixa, formasPagamento, operacao = 'adicionar') {
  let totalDinheiro = 0;

  (formasPagamento || []).forEach((pagamento) => {
    const meio = pagamento.meio_pagamento.toLowerCase().trim();
    if (meio === 'dinheiro') {
      totalDinheiro += parseFloat(pagamento.valor_pagamento);
    }
  });

  if (totalDinheiro > 0) {
    const saldoAnterior = parseFloat(caixa.saldo_final);
    if (operacao === 'adicionar') {
      caixa.saldo_final = saldoAnterior + totalDinheiro;
    } else if (operacao === 'subtrair') {
      caixa.saldo_final = saldoAnterior - totalDinheiro;
    }
  }

  return totalDinheiro;
}

/**
 * Atualiza o saldo das contas bancárias (PIX e transferência).
 * @param {Object} params
 * @param {Object} params.session - Sessão do Mongoose
 * @param {string} params.codigo_loja
 * @param {string} params.codigo_empresa
 * @param {Object|null} params.contaBancariaPadrao - Conta padrão para PIX
 * @param {number} params.totalPix
 * @param {Array} params.transferenciasDetalhadas
 * @param {'adicionar'|'subtrair'} params.operacao
 * @returns {Promise<Array>} Array de contas bancárias atualizadas (transferências)
 */
async function atualizarSaldosContas({
  session,
  codigo_loja,
  codigo_empresa,
  contaBancariaPadrao,
  totalPix,
  transferenciasDetalhadas,
  operacao = 'adicionar',
}) {
  // Atualizar conta PIX (padrão)
  if (totalPix > 0 && contaBancariaPadrao) {
    const saldoAnterior = parseFloat(contaBancariaPadrao.saldo || 0);
    if (operacao === 'adicionar') {
      contaBancariaPadrao.saldo = saldoAnterior + totalPix;
    } else {
      if (saldoAnterior < totalPix) {
        throw new Error(
          `Saldo insuficiente na conta bancária para estornar PIX. Saldo: ${saldoAnterior}, Valor: ${totalPix}`
        );
      }
      contaBancariaPadrao.saldo = saldoAnterior - totalPix;
    }
  }

  // Atualizar contas de transferências
  const contasAtualizadas = [];
  if (transferenciasDetalhadas.length > 0) {
    for (const transferencia of transferenciasDetalhadas) {
      const conta = await ContasBancarias.findOne({
        codigo_loja,
        codigo_empresa,
        codigo_conta_bancaria: transferencia.codigo_conta_bancaria,
      }).session(session);

      if (!conta) {
        throw new Error(`Conta Bancária não encontrada: ${transferencia.codigo_conta_bancaria}`);
      }

      const saldoAnterior = parseFloat(conta.saldo || 0);
      if (operacao === 'adicionar') {
        conta.saldo = saldoAnterior + transferencia.valor;
      } else {
        if (saldoAnterior < transferencia.valor) {
          throw new Error(`Saldo insuficiente na conta ${conta.conta_bancaria}`);
        }
        conta.saldo = saldoAnterior - transferencia.valor;
      }
      contasAtualizadas.push(conta);
    }
  }

  return contasAtualizadas;
}

/**
 * Cria documentos de movimentação para cada forma de pagamento.
 * @param {Object} params
 * @param {string} params.codigo_loja
 * @param {string} params.codigo_empresa
 * @param {Object} params.caixa
 * @param {number} params.codigo_movimento
 * @param {Array} params.formasPagamento
 * @param {string|number} params.documentoOrigem
 * @param {string} params.origem - Ex: 'venda', 'os'
 * @param {string} params.tipo_movimentacao - 'entrada' ou 'saida'
 * @param {Object|null} params.contaBancariaPadrao
 * @param {string} [params.observacao]
 * @returns {Array} Array de documentos Movimentacao (não salvos)
 */
function criarMovimentacoes({
  codigo_loja,
  codigo_empresa,
  caixa,
  codigo_movimento,
  formasPagamento,
  documentoOrigem,
  origem,
  tipo_movimentacao = 'entrada',
  contaBancariaPadrao,
  observacao,
}) {
  return (formasPagamento || []).map((pagamento) => {
    const mov = {
      codigo_loja,
      codigo_empresa,
      caixaId: caixa._id,
      codigo_movimento,
      caixa: caixa.caixa,
      codigo_caixa: caixa.codigo_caixa,
      tipo_movimentacao,
      valor: pagamento.valor_pagamento,
      meio_pagamento: pagamento.meio_pagamento,
      documento_origem: documentoOrigem,
      origem,
      categoria_contabil: '1.1.1',
    };

    if (observacao) {
      mov.observacao = observacao;
    }

    const meio = pagamento.meio_pagamento.toLowerCase().trim();
    if (meio === 'pix' && contaBancariaPadrao) {
      mov.codigo_conta_bancaria = contaBancariaPadrao.codigo_conta_bancaria;
    }
    if (meio === 'transferencia' && pagamento.dados_transferencia) {
      mov.codigo_conta_bancaria = pagamento.dados_transferencia.codigo_conta_bancaria;
    }

    return new Movimentacao(mov);
  });
}

module.exports = {
  calcularTotaisPorMeio,
  atualizarSaldoCaixa,
  atualizarSaldosContas,
  criarMovimentacoes,
};
