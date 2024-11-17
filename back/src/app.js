const express = require('express');
const connectToDatabase = require('./database/connect');
const router = express.Router();
const app = express();
const userRoutes = require('./routes/user.routes');
const lojasRoutes = require('./routes/lojas.routes');


app.use(express.json());
app.use(router)

app.use('/usuario', userRoutes);
app.use('/lojas', lojasRoutes);

connectToDatabase();
module.exports = app