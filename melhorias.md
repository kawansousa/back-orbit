# 🚀 Melhorias para o Projeto Back-Orbit

Documento de análise e sugestões de melhorias para o backend ERP **back-orbit**.

---

## 🔴 1. Segurança (Prioridade CRÍTICA)

### 1.1 — `.env` com credenciais expostas no repositório

O arquivo `.env` contém senhas do MongoDB e o `JWT_SECRET` em texto plano. Embora esteja no `.gitignore`, **se já foi commitado anteriormente, as credenciais estão no histórico do Git**.

**Ação:**
- Verificar se `.env` foi commitado em algum ponto (`git log --all --full-history -- .env`)
- Se sim, rotacionar **todas** as credenciais (MongoDB password, JWT_SECRET)
- Usar ferramentas como `git filter-branch` ou `BFG Repo-Cleaner` para remover do histórico
- Adicionar um `.env.example` com variáveis sem valores reais

### 1.2 — JWT sem expiração

Em `usuarioController.js` (linha 34), o token é gerado sem `expiresIn`:

```javascript
// ❌ Atual
const token = jwt.sign(payload, process.env.JWT_SECRET);

// ✅ Sugerido
const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
```

Um token sem expiração **nunca invalida**, permitindo que tokens roubados sejam usados indefinidamente.

### 1.3 — String de conexão do banco hardcoded

Em `config/database/connect.js`, a connection string do MongoDB Atlas está hardcoded com o nome do cluster:

```javascript
// ❌ Atual
`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@orbit.kuzpm.mongodb.net/ORBIT?...`

// ✅ Sugerido — usar uma variável de ambiente completa
process.env.MONGODB_URI
```

### 1.4 — CORS totalmente aberto

```javascript
// ❌ Atual
app.use(cors());

// ✅ Sugerido — restringir origens
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true,
}));
```

### 1.5 — Detalhes de erro retornados ao cliente

Em vários controllers, `error.message` é enviado diretamente ao cliente:

```javascript
// ❌ Atual
res.status(500).json({ error: error.message });

// ✅ Sugerido — logar internamente, retornar mensagem genérica
console.error('Erro interno:', error);
res.status(500).json({ error: 'Erro interno do servidor.' });
```

### 1.6 — Rate Limiting e Helmet

Não há proteção contra ataques de força bruta ou headers de segurança.

```bash
npm install helmet express-rate-limit
```

```javascript
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

app.use(helmet());
app.use('/usuario/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' }
}));
```

---

## 🟠 2. Arquitetura e Organização (Prioridade ALTA)

### 2.1 — Código duplicado massivamente nos controllers

A função `atualizarSaldoCaixa` está **copiada identicamente** em `vendasController.js` e `osController.js`. A lógica de processamento de pagamentos (dinheiro, pix, transferência) é repetida em pelo menos 6 funções diferentes.

**Ação:** Criar um `services/pagamentoService.js` centralizado:

```javascript
// services/pagamentoService.js
class PagamentoService {
  static calcularTotaisPorMeioPagamento(formasPagamento) { ... }
  static atualizarSaldoCaixa(caixa, formasPagamento, operacao) { ... }
  static atualizarSaldosContas(session, config, formasPagamento, operacao) { ... }
  static criarMovimentacoes(config, formasPagamento, documentoOrigem, origem) { ... }
}
```

### 2.2 — 16+ middlewares de auto-increment quase idênticos

Existem middlewares separados para auto-incrementar códigos de cada entidade:

```
autoIncrementCaixa.js, autoIncrementCliente.js, autoIncrementEntradas.js,
autoIncrementFornecedor.js, autoIncrementGrupos.js, autoIncrementMovimento.js,
autoIncrementOs.js, autoIncrementPagar.js, autoIncrementProduto.js, ...
```

**Ação:** Criar um único middleware genérico parametrizado:

```javascript
// middlewares/autoIncrement.js
const autoIncrement = (Model, codigoField) => async (req, res, next) => {
  const { codigo_loja, codigo_empresa } = req.body;
  const last = await Model.findOne({ codigo_loja, codigo_empresa })
    .sort({ [codigoField]: -1 });
  req.body[codigoField] = last ? last[codigoField] + 1 : 1;
  next();
};

// Uso nas rotas:
router.post('/', autoIncrement(Produto, 'codigo_produto'), produtosController.create);
```

### 2.3 — Controllers com lógica de negócio pesada

Os controllers estão com **centenas de linhas** de lógica de negócio (ex: `vendasController.js` tem **1.630 linhas**, `osController.js` tem **1.392 linhas**). Eles deveriam apenas:

1. Receber e validar a request
2. Chamar um service
3. Retornar a response

**Ação:** Migrar a lógica para a camada de services:

```
src/
  services/
    vendaService.js        ← lógica de negócio de vendas
    osService.js           ← lógica de negócio de OS
    pagamentoService.js    ← lógica financeira compartilhada
    estoqueService.js      ← controle de estoque
```

### 2.4 — Faltam camadas de Repository

Queries diretas ao MongoDB espalhadas pelos controllers. O acesso a dados deveria ser abstraído:

```
src/
  repositories/
    vendaRepository.js
    produtoRepository.js
    caixaRepository.js
```

### 2.5 — Rotas `/usuario` e `/lojas` sem middleware de autenticação

Em `app.js`:

```javascript
app.use("/usuario", userRoutes);  // ❌ sem auth
app.use("/lojas", lojasRoutes);   // ❌ sem auth
```

As rotas de criação/listagem de lojas e de criação de usuários deveriam ter auth. Apenas o endpoint de login deveria ser público.

---

## 🟡 3. Qualidade de Código (Prioridade MÉDIA)

### 3.1 — Nenhum tratamento global de erros

Não existe um error handler middleware no Express. Se um erro não tratado ocorrer, o servidor pode travar.

**Ação:**

```javascript
// middlewares/errorHandler.js
const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]', err.stack);
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Erro interno do servidor'
      : err.message,
  });
};

// app.js — DEVE ser o último app.use()
app.use(errorHandler);
```

### 3.2 — Inconsistência na nomenclatura

- Variáveis: `orcamantosRoutes` (typo, deveria ser `orcamentosRoutes`)
- Variáveis: `produtosSercice` (typo, deveria ser `produtosService`)
- Arquivos: `ladingPage.model.js` (typo, deveria ser `landingPage.model.js`)
- Rotas: `categoriaContabilRoutes.routes.js` — redundância no nome
- Middlewares: `autoIncrementmecanico.js` vs `autoIncrementOs.js` — PascalCase inconsistente

### 3.3 — `express-validator` duplicado no `package.json`

A dependência está tanto em `devDependencies` quanto em `dependencies`:

```json
"devDependencies": {
  "express-validator": "^7.2.1",  // ← remover daqui
},
"dependencies": {
  "express-validator": "^7.2.1",  // ← manter aqui
}
```

### 3.4 — `dotenv` não carregado no ponto de entrada

O `require('dotenv').config()` está em `config/database/connect.js` em vez de estar no topo de `server.js`, que deveria ser o primeiro arquivo a carregar variáveis de ambiente.

```javascript
// server.js — TOPO do arquivo
require('dotenv').config();
const app = require('./app');
```

### 3.5 — Operações financeiras com `parseFloat` em vez de aritmética precisa

Cálculos financeiros usando `parseFloat` podem causar erros de ponto flutuante:

```javascript
// ❌ Atual
caixa.saldo_final = parseFloat(saldoAnterior) + parseFloat(totalDinheiro);

// ✅ Sugerido — usar biblioteca como Decimal.js ou dinero.js
// npm install decimal.js
const Decimal = require('decimal.js');
caixa.saldo_final = new Decimal(saldoAnterior).plus(totalDinheiro).toNumber();
```

### 3.6 — Bug no `getOsById` — variável sombreando o model

Em `osController.js` (linha 536):

```javascript
const Os = await Os.findOne({ ... }); // ❌ Bug: "Os" sobrescreve o model importado
```

Deveria ser:

```javascript
const os = await Os.findOne({ ... }); // ✅ variável em camelCase
```

### 3.7 — Duplo ponto-e-vírgula

Em `authUser.js` (linha 29):

```javascript
const parts = cleanPath.split('.');; // ❌ dois ponto-e-vírgula
```

---

## 🔵 4. Performance (Prioridade MÉDIA)

### 4.1 — Sem índices documentados nos models

Os models Mongoose não declaram índices compostos. Para queries frequentes como:

```javascript
{ codigo_loja, codigo_empresa, codigo_produto }
```

Devem ser criados índices compostos:

```javascript
produtoSchema.index({ codigo_loja: 1, codigo_empresa: 1, codigo_produto: 1 });
vendaSchema.index({ codigo_loja: 1, codigo_empresa: 1, codigo_venda: 1 });
```

### 4.2 — Puppeteer para geração de PDF

O uso de `puppeteer` para gerar PDFs é pesado em memória e CPU. Considere alternativas mais leves:

- **PDFKit** (já é dependência do projeto) — usar diretamente
- **html-pdf-node** — mais leve que puppeteer

### 4.3 — Queries sequenciais que podem ser paralelas

Em `criarVenda`, várias queries são feitas sequencialmente quando poderiam ser paralelas:

```javascript
// ❌ Atual — sequencial
const caixa = await Caixa.findOne(...);
const contaBancariaPadrao = await ContasBancarias.findOne(...);

// ✅ Sugerido — paralelo
const [caixa, contaBancariaPadrao] = await Promise.all([
  Caixa.findOne(...).session(session),
  ContasBancarias.findOne(...).session(session),
]);
```

### 4.4 — Dependências desnecessariamente pesadas

- `chrome-aws-lambda` (27MB+) e `@sparticuz/chromium` (55MB+) — extremamente pesados. Se não está fazendo deploy na AWS Lambda, remover.
- `moment` (300KB) — substituir por `dayjs` (2KB) ou usar `Intl.DateTimeFormat` nativo.
- `pug` — se só usa EJS para views, remover o Pug ou vice-versa.

---

## 🟢 5. Boas Práticas e DevOps (Prioridade RECOMENDADA)

### 5.1 — Adicionar testes automatizados

O projeto **não possui nenhum teste**. Recomendações:

```bash
npm install --save-dev vitest supertest
```

Mínimo recomendado:
- Testes unitários para services (lógica de pagamento, estoque)
- Testes de integração para rotas críticas (login, vendas)

### 5.2 — Adicionar um logger estruturado

Substituir `console.log/error` por um logger como **Winston** ou **Pino**:

```bash
npm install pino pino-pretty
```

```javascript
const pino = require('pino');
const logger = pino({ level: process.env.LOG_LEVEL || 'info' });
```

### 5.3 — Adicionar validação com schema (Zod ou Joi)

A validação com `express-validator` está espalhada (e misturada com lógica de auto-increment). Considere migrar para **Zod**:

```javascript
const { z } = require('zod');

const vendaSchema = z.object({
  codigo_loja: z.string(),
  codigo_empresa: z.string(),
  itens: z.array(z.object({
    codigo_produto: z.number(),
    quantidade: z.number().positive(),
  })).min(1),
  forma_pagamento: z.array(z.object({
    meio_pagamento: z.enum(['dinheiro', 'pix', 'transferencia', 'cartao']),
    valor_pagamento: z.number().positive(),
  })).min(1),
});
```

### 5.4 — Documentação da API

Adicionar documentação com **Swagger/OpenAPI**:

```bash
npm install swagger-ui-express swagger-jsdoc
```

### 5.5 — Health Check endpoint

Adicionar um endpoint de health check:

```javascript
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});
```

### 5.6 — Compressão de respostas

```bash
npm install compression
```

```javascript
const compression = require('compression');
app.use(compression());
```

### 5.7 — Adicionar `.nvmrc` ou `engines` no package.json

Garantir que todos usem a mesma versão do Node.js:

```json
"engines": {
  "node": ">=18.0.0"
}
```

---

## 📋 Resumo de Prioridades

| Prioridade | Área | Ação |
|------------|------|------|
| 🔴 Crítica | Segurança | JWT com expiração, CORS restrito, credenciais do `.env` |
| 🔴 Crítica | Bug | Fix `getOsById` variável sombreando model |
| 🟠 Alta | Arquitetura | Extrair lógica para services, unificar auto-increments |
| 🟠 Alta | Arquitetura | Proteger rotas `/usuario` e `/lojas` com auth |
| 🟡 Média | Código | Error handler global, fix typos, limpar deps duplicadas |
| 🟡 Média | Performance | Índices, paralelizar queries, remover deps pesadas |
| 🔵 Recomendada | DevOps | Testes, logger, documentação Swagger, health check |

---

> **Nota:** Este documento foca nas melhorias mais impactantes. A implementação deve ser feita de forma incremental, começando pelas correções de segurança.
