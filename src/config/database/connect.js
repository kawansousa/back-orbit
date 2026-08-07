const mongoose = require('mongoose');
const logger = require('../../utils/logger');

const ENV_URI_MAP = {
  production: 'MONGODB_URI_PROD',
  development: 'MONGODB_URI_DEV',
  test: 'MONGODB_URI_TEST',
};

const connectToDatabase = async () => {
  try {
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    const env = process.env.NODE_ENV || 'development';
    const envKey = ENV_URI_MAP[env];

    // Prioridade: URI específica do ambiente → URI genérica → fallback legado
    const uri = (envKey && process.env[envKey])
      || process.env.MONGODB_URI
      || `mongodb+srv://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@orbit.kuzpm.mongodb.net/ORBIT?retryWrites=true&w=majority&appName=ORBIT`;

    await mongoose.connect(uri);

    logger.info(`Conectado ao banco de dados [${env}] com sucesso`);
  } catch (error) {
    logger.error(`❌ Erro ao se conectar ao banco de dados: ${error.message}`);
  }
};

module.exports = connectToDatabase;

