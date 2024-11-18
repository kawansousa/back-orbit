const express = require('express');
const cors = require('cors');
const connectToDatabase = require('./database/connect');
const router = express.Router();
const app = express();
const userRoutes = require('./routes/user.routes');
const lojasRoutes = require('./routes/lojas.routes');
const produtosRoutes = require('./routes/produtos.routes');
const clientesRoutes = require('./routes/clientes.routes');
const auth = require('./middlewares/auth');

// Usar o CORS com as opções definidas
app.use(cors());

app.use(express.json());
app.use(router);

app.use('/usuario', userRoutes);
app.use('/lojas', auth, lojasRoutes);
app.use('/produtos', auth, produtosRoutes);
app.use('/clientes', auth, clientesRoutes);

connectToDatabase();
module.exports = app;
