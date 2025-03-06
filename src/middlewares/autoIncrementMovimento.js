const Movimentacao = require('../models/movimentacoes_caixa.model');

async function autoIncrementMovimento(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja } = req.body;
    // Validar se os códigos de loja e empresa estão presentes
    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }
    
    // Buscar o último código do Movimento para a combinação de loja e empresa
    const lastMovimento = await Movimentacao.findOne({ codigo_loja, codigo_empresa })
      .sort({ codigo_movimento: -1 });
    
    // Definir o próximo código de Movimento inicial
    let nextCodigoMovimento = lastMovimento ? lastMovimento.codigo_movimento + 1 : 1;
    
    // Adicionar o código de Movimento explicitamente ao corpo da requisição
    req.body.codigo_movimento = nextCodigoMovimento;
    
    // Se houver parcelas, adicione códigos de movimento incrementais
    if (req.body.parcelas && Array.isArray(req.body.parcelas)) {
      req.body.parcelas = req.body.parcelas.map((parcela, index) => ({
        ...parcela,
        codigo_movimento: nextCodigoMovimento + index
      }));
    }
    
    
    next();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
module.exports = autoIncrementMovimento;
