const Loja = require('../models/lojas.model'); 

module.exports = async function incrementarCodigos(req, res, next) {
  try {
    if (!req.body.codigo_loja) {
      const ultimaLoja = await Loja
        .findOne()
        .sort({ codigo_loja: -1 })
        .select('codigo_loja');
      
      req.body.codigo_loja = ultimaLoja ? ultimaLoja.codigo_loja + 1 : 1;
    }

    if (req.body.empresas && req.body.empresas.length > 0) {
      req.body.empresas.forEach((empresa, index) => {
        if (!empresa.codigo_empresa) {
          empresa.codigo_empresa = index + 1;
        }
      });
    }

    next(); 
  } catch (error) {
    console.error('Erro ao incrementar códigos:', error);
    return res.status(500).json({ 
      error: 'Erro ao gerar códigos automáticos',
      details: error.message 
    });
  }
};