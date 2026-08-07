const Counter = require("../models/counter.model");

/**
 * Serviço de geração de códigos sequenciais ATÔMICOS.
 *
 * Substitui o padrão antigo (findOne().sort() + 1), que sofria de race condition:
 * dois requests simultâneos liam o mesmo "último código" e geravam códigos duplicados.
 *
 * Aqui o incremento usa findOneAndUpdate + $inc, que é atômico no MongoDB — cada
 * chamada recebe um número exclusivo, mesmo sob concorrência.
 *
 * Observação sobre gaps: se a transação do controller abortar depois de reservar um
 * código, aquele número fica "queimado" (gap na sequência). Isso é aceitável e seguro —
 * gaps não corrompem nada; o que corrompe um ERP é código DUPLICADO, e isso não ocorre mais.
 */

/**
 * Monta o _id da sequência a partir da entidade e do escopo (loja/empresa).
 */
function buildKey(entidade, codigo_loja, codigo_empresa, extra) {
  const parts = [entidade, codigo_loja, codigo_empresa];
  if (extra !== undefined && extra !== null && extra !== "") {
    parts.push(extra);
  }
  return parts.join(":");
}

/**
 * Garante que a sequência exista, semeando-a a partir do maior código já presente
 * na coleção da entidade (para não colidir com dados legados). Idempotente e seguro
 * sob concorrência graças ao $setOnInsert.
 */
async function ensureSeeded({ key, Model, codigoField, scope, session }) {
  const exists = await Counter.findById(key).session(session || null);
  if (exists) return;

  const ultimo = await Model.findOne(scope)
    .sort({ [codigoField]: -1 })
    .select(codigoField)
    .session(session || null);

  const start = ultimo ? ultimo[codigoField] : 0;

  // $setOnInsert só grava se o doc ainda não existir; se dois requests semearem
  // ao mesmo tempo, apenas um insere e o outro vira no-op.
  await Counter.updateOne(
    { _id: key },
    { $setOnInsert: { seq: start } },
    { upsert: true, session: session || undefined }
  );
}

/**
 * Reserva o próximo código (1 unidade) de forma atômica.
 *
 * @param {Object} params
 * @param {string} params.entidade        - Ex: "os", "venda", "produto"
 * @param {import('mongoose').Model} params.Model - Model da entidade (para seeding)
 * @param {string} params.codigoField     - Campo de código (ex: "codigo_os")
 * @param {string} params.codigo_loja
 * @param {string} params.codigo_empresa
 * @param {string} [params.extra]         - Discriminador extra no escopo (ex: origem da venda)
 * @param {import('mongoose').ClientSession} [params.session]
 * @returns {Promise<number>} próximo código
 */
async function next({
  entidade,
  Model,
  codigoField,
  codigo_loja,
  codigo_empresa,
  extra,
  extraField,
  session,
}) {
  const key = buildKey(entidade, codigo_loja, codigo_empresa, extra);
  const scope = { codigo_loja, codigo_empresa };
  // Se a sequência é discriminada por um campo extra (ex: 'origem' em vendas),
  // o seeding precisa filtrar por ele para não ler o máximo de outra fatia.
  if (extraField && extra !== undefined && extra !== null && extra !== "") {
    scope[extraField] = extra;
  }

  await ensureSeeded({ key, Model, codigoField, scope, session });

  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, session: session || undefined }
  );

  return doc.seq;
}

/**
 * Reserva um BLOCO de N códigos consecutivos de forma atômica (para parcelas).
 *
 * @returns {Promise<number[]>} array com os N códigos reservados, em ordem.
 */
async function nextBlock({
  entidade,
  Model,
  codigoField,
  codigo_loja,
  codigo_empresa,
  extra,
  extraField,
  count,
  session,
}) {
  if (!count || count < 1) return [];

  const key = buildKey(entidade, codigo_loja, codigo_empresa, extra);
  const scope = { codigo_loja, codigo_empresa };
  if (extraField && extra !== undefined && extra !== null && extra !== "") {
    scope[extraField] = extra;
  }

  await ensureSeeded({ key, Model, codigoField, scope, session });

  const doc = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: count } },
    { new: true, session: session || undefined }
  );

  // doc.seq é o fim do bloco; o início é (fim - count + 1).
  const fim = doc.seq;
  const inicio = fim - count + 1;
  const codigos = [];
  for (let i = inicio; i <= fim; i++) codigos.push(i);
  return codigos;
}

module.exports = { next, nextBlock, buildKey };
