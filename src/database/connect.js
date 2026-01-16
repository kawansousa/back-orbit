const mongoose = require('mongoose');
require('dotenv').config();

const connectToDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    /*     await mongoose.connect(
          `mongodb+srv://ORBIT:${process.env.MONGODB_PASSWORD}@orbit.kuzpm.mongodb.net/?appName=${process.env.MONGODB_USERNAME}`
        ); 
        */

    /*     await mongoose.connect(
          `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@ac-udocqcl-shard-00-00.eef4pue.mongodb.net:27017,ac-udocqcl-shard-00-01.eef4pue.mongodb.net:27017,ac-udocqcl-shard-00-02.eef4pue.mongodb.net:27017/${"ORBIT"}?ssl=true&replicaSet=atlas-51e6a4-shard-0&authSource=admin&retryWrites=true&w=majority`
        ); */
    await mongoose.connect(
      `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@orbit.kuzpm.mongodb.net/ORBIT?retryWrites=true&w=majority&appName=ORBIT`
    );
    console.log('✅ Conectado ao banco de dados com sucesso');
  } catch (error) {
    console.error(`❌ Erro ao se conectar ao banco de dados: ${error.message}`);
  }
};

module.exports = connectToDatabase;
