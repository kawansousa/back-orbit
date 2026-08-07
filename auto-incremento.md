# 🔄 Auto-Increment — Análise e Como Deveria Ser Feito

## Situação Atual

O projeto possui **16 arquivos** de auto-increment na pasta `middlewares/`, totalizando **~400 linhas de código**. A grande maioria é **código copiado e colado** com apenas 3 variáveis trocadas: o model, o nome do campo, e o nome da variável local.

---

## Inventário Completo

### Padrão 1: Simples (10 arquivos — copia e cola puro)

Estes 10 arquivos fazem **exatamente a mesma coisa**: buscam o último documento por `{codigo_loja, codigo_empresa}`, pegam o maior código e somam +1.

| Arquivo | Model | Campo |
|---------|-------|-------|
| `autoIncrementOs.js` | Os | `codigo_os` |
| `autoIncrementFornecedor.js` | Fornecedor | `codigo_fornecedor` |
| `autoIncrementGrupos.js` | Grupos | `codigo_grupo` |
| `autoIncrementOrcamentos.js` | Orcamento | `codigo_orcamento` |
| `autoIncrementContasBancariasController.js` | ContasBancarias | `codigo_conta_bancaria` |
| `autoIncrementmecanico.js` | Mecanico | `codigo_mecanico` |
| `autoIncrementservico.js` | Servicos | `codigo_servico` |
| `autoIncrementEntradas.js` | Entrada | `codigo_entrada` |
| `autoIncrementSaidas.js` | Saida | `codigo_saida` |
| `autoIncremenLandingPage.js` | — | — (**arquivo vazio!**) |

**Código repetido em cada um deles:**

```javascript
const lastDoc = await Model.findOne({ codigo_loja, codigo_empresa }).sort({ campo: -1 });
const next = lastDoc ? lastDoc.campo + 1 : 1;
req.body.campo = next;
next();
```

### Padrão 2: Incremento com filtros extras (2 arquivos)

| Arquivo | Model | Campo | Filtro Extra |
|---------|-------|-------|--------------|
| `autoIncrementCaixa.js` | Caixa | `codigo_caixa` | Filtra por `caixa` (número do caixa) |
| `autoIncrementVendas.js` | Venda | `codigo_venda` | Filtra por `origem` (web/pdv) |

Estes são como o Padrão 1, mas adicionam um campo extra ao filtro de busca.

### Padrão 3: Incremento com parcelas (3 arquivos)

| Arquivo | Model | Campo | Lógica Extra |
|---------|-------|-------|--------------|
| `autoIncrementMovimento.js` | Movimentação | `codigo_movimento` | Distribui códigos sequenciais nas `parcelas[]` |
| `autoIncrementMovimentoBanco.js` | MovBanco | `codigo_movimento_banco` | Distribui códigos sequenciais nas `parcelas[]` |
| `autoIncrementPagar.js` | Pagar | `codigo_pagar` | Distribui códigos sequenciais nas `parcelas[]` |
| `autoIncrementreceber.js` | Receber | `codigo_receber` | Distribui códigos sequenciais nas `parcelas[]` |

Estes buscam o próximo código e também atribuem códigos incrementais a um array de `parcelas` no body.

### Padrão 4: Incremento + Validação (2 arquivos)

| Arquivo | Model | Campo | Extra |
|---------|-------|-------|-------|
| `autoIncrementProduto.js` | Produto | `codigo_produto` | Validação com `express-validator` + geração de `codigo_barras` |
| `autoIncrementCliente.js` | Cliente | `codigo_cliente` | Validação de CPF/CNPJ/email com `express-validator` |

Estes misturam duas responsabilidades: **validação de dados** e **auto-increment**. São arrays de middlewares em vez de funções simples.

### Padrão 5: Especial — Lojas/Empresas

| Arquivo | Lógica |
|---------|--------|
| `incrementarCodigos.js` | Incrementa `codigo_loja` e `codigo_empresa` — lógica mais complexa e única |

---

## Problemas Identificados

### 🔴 1. Código Duplicado Massivo
10 arquivos possuem literalmente o mesmo código com 3 variáveis trocadas. São **~200 linhas** que poderiam ser **5 linhas**.

### 🔴 2. Race Condition (Problema de Concorrência)
**Este é o problema mais grave.** O padrão atual faz:

```
1. Busca o último código         → findOne().sort({ codigo: -1 })
2. Calcula o próximo             → ultimo + 1
3. Grava no banco (mais tarde)   → documento.save()
```

Se **duas requisições** chegarem ao mesmo tempo:

```
Req A: Busca último código → 42
Req B: Busca último código → 42    (antes de A salvar)
Req A: Salva com código 43
Req B: Salva com código 43         ← CÓDIGO DUPLICADO!
```

Isso gera **vendas, OS, clientes, etc. com o mesmo código**. Em um sistema ERP isso é inaceitável.

### 🟠 3. Responsabilidades Misturadas
`autoIncrementProduto.js` e `autoIncrementCliente.js` misturam validação com incremento. Devem ser middlewares separados.

### 🟠 4. Nomenclatura Inconsistente
- `autoIncrementmecanico.js` (minúsculo)
- `autoIncrementOs.js` (PascalCase)
- `autoIncrementreceber.js` (minúsculo)
- `autoIncrementservico.js` (minúsculo)
- `autoIncrementContasBancariasController.js` (nome de controller!)
- `autoIncremenLandingPage.js` (typo: falta o "t" em "Increment", e está vazio)
- `autoIncrementVendas.js` → exporta `autoIncrementVendass` (typo: dois "s")

### 🟡 5. `autoIncremenLandingPage.js` é um arquivo vazio
Um arquivo de 0 bytes que não faz nada e nunca é importado.

---

## Como Deveria Ser Feito

### Solução A — Middleware Genérico (Simples, já criado)

O middleware `autoIncrement.js` que já criei resolve o Padrão 1 e 2:

```javascript
// middlewares/autoIncrement.js
function autoIncrement(Model, codigoField, options = {}) {
  return async (req, res, next) => {
    const { codigo_loja, codigo_empresa } = req.body;
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios.' });
    }

    const filter = { codigo_loja, codigo_empresa };
    if (options.extraFilterBodyField) {
      filter[options.extraFilterBodyField] = req.body[options.extraFilterBodyField];
    }

    const lastDoc = await Model.findOne(filter).sort({ [codigoField]: -1 });
    req.body[codigoField] = lastDoc ? lastDoc[codigoField] + 1 : 1;
    next();
  };
}
```

**Uso nas rotas:**

```javascript
const autoIncrement = require('../middlewares/autoIncrement');
const Os = require('../models/os.model');
const Venda = require('../models/vendas.model');
const Caixa = require('../models/caixa.model');

// Padrão 1 — simples
router.post('/', autoIncrement(Os, 'codigo_os'), osController.createOs);

// Padrão 2 — com filtro extra
router.post('/', autoIncrement(Venda, 'codigo_venda', { extraFilterBodyField: 'origem' }), vendasController.criarVenda);
router.post('/', autoIncrement(Caixa, 'codigo_caixa', { extraFilterBodyField: 'caixa' }), caixaController.criarCaixa);
```

Isso substituiria **12 arquivos** por **1 arquivo de ~20 linhas**.

### Solução B — Middleware com Suporte a Parcelas

Para os middlewares que distribuem códigos em parcelas, uma extensão:

```javascript
// middlewares/autoIncrementWithParcelas.js
function autoIncrementWithParcelas(Model, codigoField) {
  return async (req, res, next) => {
    const { codigo_loja, codigo_empresa, parcelas } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios.' });
    }

    const lastDoc = await Model.findOne({ codigo_loja, codigo_empresa })
      .sort({ [codigoField]: -1 });
    let nextCode = lastDoc ? lastDoc[codigoField] + 1 : 1;

    // Atribui o código base
    req.body[codigoField] = nextCode;

    // Distribui códigos incrementais nas parcelas
    if (parcelas && Array.isArray(parcelas)) {
      req.body.parcelas = parcelas.map((parcela, index) => ({
        ...parcela,
        [codigoField]: nextCode + index,
      }));
    }

    next();
  };
}

module.exports = autoIncrementWithParcelas;
```

**Uso:**

```javascript
const autoIncrementWithParcelas = require('../middlewares/autoIncrementWithParcelas');
const Receber = require('../models/receber.model');
const Pagar = require('../models/pagar.model');
const Movimentacao = require('../models/movimentacoes_caixa.model');

router.post('/', autoIncrementWithParcelas(Receber, 'codigo_receber'), receberController.create);
router.post('/', autoIncrementWithParcelas(Pagar, 'codigo_pagar'), pagarController.create);
router.post('/', autoIncrementWithParcelas(Movimentacao, 'codigo_movimento'), caixaController.create);
```

Isso substituiria **mais 4 arquivos**.

### Solução C — Resolver a Race Condition

A abordagem correta para evitar códigos duplicados é usar **operações atômicas** do MongoDB:

```javascript
// middlewares/autoIncrementAtomic.js
const mongoose = require('mongoose');

// Model de contadores
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Ex: "venda_1_001"
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.model('Counter', counterSchema);

/**
 * Auto-increment atômico — seguro para concorrência.
 * Usa findOneAndUpdate com $inc para garantir que nunca haverá duplicados.
 */
function autoIncrementAtomic(entityName, codigoField, options = {}) {
  return async (req, res, next) => {
    try {
      const { codigo_loja, codigo_empresa } = req.body;

      if (!codigo_loja || !codigo_empresa) {
        return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios.' });
      }

      // Chave única por entidade + loja + empresa
      const counterId = `${entityName}_${codigo_loja}_${codigo_empresa}`;

      // $inc é atômico no MongoDB — nunca gera duplicados
      const counter = await Counter.findOneAndUpdate(
        { _id: counterId },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
      );

      req.body[codigoField] = counter.seq;

      // Se precisar distribuir em parcelas
      if (options.parcelas && req.body.parcelas && Array.isArray(req.body.parcelas)) {
        const totalParcelas = req.body.parcelas.length;
        if (totalParcelas > 1) {
          // Reserva códigos extras para as parcelas restantes
          const extraCounter = await Counter.findOneAndUpdate(
            { _id: counterId },
            { $inc: { seq: totalParcelas - 1 } },
            { new: true }
          );

          req.body.parcelas = req.body.parcelas.map((parcela, index) => ({
            ...parcela,
            [codigoField]: counter.seq + index,
          }));
        } else {
          req.body.parcelas = req.body.parcelas.map((parcela) => ({
            ...parcela,
            [codigoField]: counter.seq,
          }));
        }
      }

      next();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
}

module.exports = autoIncrementAtomic;
```

**Como funciona:**

```
Req A: findOneAndUpdate($inc: 1) → retorna 43 (atômico!)
Req B: findOneAndUpdate($inc: 1) → retorna 44 (atômico!)
```

O `$inc` do MongoDB é uma operação atômica no nível do banco. **Nunca gera duplicados**, mesmo com milhares de requisições simultâneas.

**Uso:**

```javascript
const autoIncrement = require('../middlewares/autoIncrementAtomic');

// Simples
router.post('/', autoIncrement('venda', 'codigo_venda'), vendasController.criarVenda);
router.post('/', autoIncrement('os', 'codigo_os'), osController.createOs);
router.post('/', autoIncrement('cliente', 'codigo_cliente'), clientesController.createCliente);

// Com parcelas
router.post('/', autoIncrement('receber', 'codigo_receber', { parcelas: true }), receberController.create);
router.post('/', autoIncrement('pagar', 'codigo_pagar', { parcelas: true }), pagarController.create);
```

### Solução D — Separar Validação do Incremento

Para `autoIncrementProduto.js` e `autoIncrementCliente.js`, a validação deve ser **separada** em middlewares próprios:

```javascript
// middlewares/validators/produtoValidator.js
const { body, validationResult } = require('express-validator');

const validarProduto = [
  body('descricao').notEmpty().withMessage('A descrição é obrigatória.').isString(),
  body('status').optional().isIn(['ativo', 'inativo']).withMessage('Status inválido.'),
  body('precos').isArray().withMessage('Preços devem ser um array.'),
  body('precos.*.preco_compra').notEmpty().isFloat({ min: 0 }),
  body('precos.*.preco_venda').notEmpty().isFloat({ min: 0 }),
  // ... etc
  (req, res, next) => {
    const erros = validationResult(req);
    if (!erros.isEmpty()) {
      return res.status(400).json({ erros: erros.array() });
    }
    next();
  },
];

module.exports = validarProduto;
```

```javascript
// Rota
router.post('/',
  validarProduto,                                    // 1. Valida
  autoIncrement('produto', 'codigo_produto'),        // 2. Incrementa
  gerarCodigoBarras,                                 // 3. Gera código de barras
  produtosController.create                          // 4. Cria
);
```

---

## Plano de Migração

### Fase 1 — Criar a infraestrutura (✅ já feito)
- [x] `middlewares/autoIncrement.js` genérico

### Fase 2 — Criar o counter atômico
- [ ] Criar o model `Counter` em `models/counter.model.js`
- [ ] Criar `middlewares/autoIncrementAtomic.js`
- [ ] Testar com uma entidade simples (ex: Grupos)

### Fase 3 — Migrar progressivamente
Prioridade (do mais simples ao mais complexo):

1. **Grupos, Mecânico, Serviço** — mais simples, baixo risco
2. **Fornecedor, ContasBancarias, Orçamentos** — simples
3. **OS, Entrada, Saída** — simples mas mais usados
4. **Caixa, Vendas** — filtro extra, testar com cuidado
5. **Movimento, MovimentoBanco, Pagar, Receber** — com parcelas
6. **Produto, Cliente** — separar validação primeiro

### Fase 4 — Apagar arquivos antigos
Após migrar tudo, deletar os 16 arquivos e o arquivo vazio `autoIncremenLandingPage.js`.

---

## Resumo

| Métrica | Atual | Proposto |
|---------|-------|----------|
| **Arquivos** | 16 | 2-3 |
| **Linhas de código** | ~400 | ~80 |
| **Seguro para concorrência** | ❌ Não | ✅ Sim (atômico) |
| **Validação separada** | ❌ Misturada | ✅ Separada |
| **Suporte a parcelas** | Código duplicado | Parametrizado |

> **Recomendação final:** A **Solução C (atômica)** é a ideal para produção. Sem ela, o sistema está vulnerável a códigos duplicados sempre que dois usuários criarem registros ao mesmo tempo. Em um ERP multi-loja isso **vai** acontecer.
