const mongoose = require('mongoose');
require('dotenv').config();

const connectToDatabase = async () => {
  try {
    await mongoose.connect(`mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@orbit.kuzpm.mongodb.net/ORBIT?retryWrites=true&w=majority&appName=ORBIT`);
    
    console.log('Conectado ao banco de dados com sucesso');

  } catch (error) {
    console.error(`Erro ao se conectar ao banco de dados: ${error.message}`);
  }
};

module.exports = connectToDatabase;