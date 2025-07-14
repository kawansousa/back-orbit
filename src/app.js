const express = require("express");
const cors = require("cors");
const connectToDatabase = require("./database/connect");
const router = express.Router();
const app = express();
const userRoutes = require("./routes/user.routes");
const lojasRoutes = require("./routes/lojas.routes");
const produtosRoutes = require("./routes/produtos.routes");
const clientesRoutes = require("./routes/clientes.routes");
const fornecedoresRoutes = require("./routes/fornecedores.routes");
const cidadesRoutes = require("./routes/cidades.routes");
const gruposRoutes = require("./routes/grupos.routes");
const orcamantosRoutes = require("./routes/orcamentos.routes");
const caixaRoutes = require("./routes/caixa.routes");
const receberRoutes = require("./routes/receber.routes");
const vendasRoutes = require("./routes/vendas.routes");
const entradasRoutes = require("./routes/etradas.routes");
const categoriaContabilRoutes = require("./routes/categoriaContabilRoutes.routes");
const contasBancariasRoutes = require("./routes/contasBancariasRoutes.routes");
const servicosRoutes = require("./routes/servicosRoutes.routes");
const osRoutes = require("./routes/osRoutes.routes");
const auth = require("./middlewares/auth");

// Usar o CORS com as opções definidas
app.use(cors());

app.use(express.json());
app.use(router);

app.use("/usuario", userRoutes);
app.use("/lojas", auth, lojasRoutes);
app.use("/produtos", auth, produtosRoutes);
app.use("/clientes", auth, clientesRoutes);
app.use("/fornecedores", auth, fornecedoresRoutes);
app.use("/cidades", auth, cidadesRoutes);
app.use("/grupos", auth, gruposRoutes);
app.use("/orcamentos", auth, orcamantosRoutes);
app.use("/caixa", auth, caixaRoutes);
app.use("/receber", auth, receberRoutes);
app.use("/vendas", auth, vendasRoutes);
app.use("/entradas", auth, entradasRoutes);
app.use("/categoriaContabil", categoriaContabilRoutes);
app.use("/contasBancarias", contasBancariasRoutes);
app.use("/servicos", auth, servicosRoutes);
app.use("/os", auth, osRoutes);
/* os  */

connectToDatabase();
module.exports = app;
