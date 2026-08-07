const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const rateLimit = require("express-rate-limit");
const connectToDatabase = require("./config/database/connect.js");
const errorHandler = require("./middlewares/errorHandler");
const logger = require("./utils/logger");
const cookieParser = require("cookie-parser");

const app = express();

// --- Segurança ---
app.use(helmet());
// Com credentials:true o navegador PROÍBE origin "*".
// Sem ALLOWED_ORIGINS definido, restringimos a localhost (dev) ao invés de abrir geral.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000", "http://localhost:5173"];

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  credentials: true,
}));

// --- Performance ---
app.use(compression());

// --- Body parsing ---
app.use(express.json());

// --- Cookie parsing ---
app.use(cookieParser());

// --- Health check ---
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// --- Rate limiting para login ---
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
});


// --- Rotas ---
const userRoutes = require("./routes/user.routes");
const roleRoutes = require("./routes/role.routes");
const lojasRoutes = require("./routes/lojas.routes");
const produtosRoutes = require("./routes/produtos.routes");
const produtosService = require("./routes/produtosSite.routes.js");
const gruposService = require("./routes/gruposSite.routes.js");
const clientesRoutes = require("./routes/clientes.routes");
const fornecedoresRoutes = require("./routes/fornecedores.routes");
const cidadesRoutes = require("./routes/cidades.routes");
const gruposRoutes = require("./routes/grupos.routes");
const orcamentosRoutes = require("./routes/orcamentos.routes");
const caixaRoutes = require("./routes/caixa.routes");
const receberRoutes = require("./routes/receber.routes");
const vendasRoutes = require("./routes/vendas.routes");
const entradasRoutes = require("./routes/entradas.routes");
const saidasRoutes = require("./routes/saidas.routes");
const categoriaContabilRoutes = require("./routes/categoriaContabilRoutes.routes");
const contasBancariasRoutes = require("./routes/contasBancariasRoutes.routes");
const servicosRoutes = require("./routes/servicosRoutes.routes");
const osRoutes = require("./routes/osRoutes.routes");
const mecanicosRoutes = require("./routes/mecanicosRoutes.routes");
const pagarRoutes = require("./routes/pagar.routes");
const landingPageRoutes = require("./routes/landingPage.routes");
const auth = require("./middlewares/auth");

// Rotas públicas
app.use("/usuario", loginLimiter, userRoutes);
app.use("/produtosCatalogo", produtosService);
app.use("/gruposCatalogo", gruposService);
app.use("/landingPage", landingPageRoutes);
app.use("/lojas", lojasRoutes);

// Rotas protegidas
app.use("/roles", auth, roleRoutes);
app.use("/produtos", auth, produtosRoutes);
app.use("/clientes", auth, clientesRoutes);
app.use("/fornecedores", auth, fornecedoresRoutes);
app.use("/cidades", auth, cidadesRoutes);
app.use("/grupos", auth, gruposRoutes);
app.use("/orcamentos", auth, orcamentosRoutes);
app.use("/caixa", auth, caixaRoutes);
app.use("/receber", auth, receberRoutes);
app.use("/vendas", auth, vendasRoutes);
app.use("/entradas", auth, entradasRoutes);
app.use("/saidas", auth, saidasRoutes);
app.use("/categoriaContabil", auth, categoriaContabilRoutes);
app.use("/contasBancarias", auth, contasBancariasRoutes);
app.use("/os", auth, osRoutes);
app.use("/servicos", auth, servicosRoutes);
app.use("/mecanicos", auth, mecanicosRoutes);
app.use("/pagar", auth, pagarRoutes);

// --- Error handler global (DEVE ser o último) ---
app.use(errorHandler);

connectToDatabase();
module.exports = app;
