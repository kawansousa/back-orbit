const Receber = require('../models/receber.model');

async function autoIncrementreceber(req, res, next) {
  try {
    const { codigo_empresa, codigo_loja, parcelas } = req.body;

    if (!codigo_empresa || !codigo_loja) {
      return res.status(400).json({ error: 'Código da loja e empresa são obrigatórios' });
    }

    if (!parcelas || !Array.isArray(parcelas) || parcelas.length === 0) {
      return res.status(400).json({ error: 'Parcelas são obrigatórias e devem ser um array não vazio' });
    }

    const ultimoReceber = await Receber.findOne({
      codigo_loja,
      codigo_empresa
    })
    .sort({ codigo_receber: -1 })
    .select('codigo_receber')
    .lean();

    let proximoCodigo = ultimoReceber ? ultimoReceber.codigo_receber + 1 : 1;

    console.log(`Último código encontrado: ${ultimoReceber?.codigo_receber || 'Nenhum'}`);
    console.log(`Próximo código base: ${proximoCodigo}`);

    req.body.parcelas = parcelas.map((parcela, index) => {
      const codigoReceber = proximoCodigo + index;
      
      console.log(`Gerando código receber: ${codigoReceber} para parcela ${index + 1}/${parcelas.length}`);
      
      return {
        ...parcela,
        codigo_receber: codigoReceber
      };
    });
    
    console.log('Códigos gerados em sequência:', req.body.parcelas.map((p, index) => ({
      parcela: `${index + 1}/${parcelas.length}`,
      codigo: p.codigo_receber
    })));

    next();
  } catch (error) {
    console.error('Erro no autoIncrement:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementreceber;