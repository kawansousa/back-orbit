const app = require('./app');


const PORT = process.env.PORT || 3333;

app.listen(PORT, '0.0.0.0', () => console.log(`server rodando na porta! ${PORT}`)); 
