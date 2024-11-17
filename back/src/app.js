const express = require('express');
const cors = require('cors'); // Importar o pacote CORS
const connectToDatabase = require('./database/connect');
const router = express.Router();
const app = express();
const userRoutes = require('./routes/user.routes');
const lojasRoutes = require('./routes/lojas.routes');
const auth = require('./middlewares/auth');

// Configuração do CORS
const corsOptions = {
  origin: 'http://localhost:5174', // Permitindo apenas a origem do frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
};

// Usar o CORS com as opções definidas
app.use(cors(corsOptions));

app.use(express.json());
app.use(router);

app.use('/usuario', userRoutes);
app.use('/lojas', auth, lojasRoutes);

connectToDatabase();
module.exports = app;
