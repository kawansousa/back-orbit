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

    const maxReceberResult = await Receber.aggregate([
      {
        $match: {
          codigo_loja: codigo_loja,
          codigo_empresa: codigo_empresa
        }
      },
      {
        $group: {
          _id: null,
          maxCodigo: { $max: "$codigo_receber" }
        }
      }
    ]);

    let nextCodigoReceber = maxReceberResult.length > 0 && maxReceberResult[0].maxCodigo 
      ? maxReceberResult[0].maxCodigo + 1 
      : 1;

    req.body.parcelas = parcelas.map((parcela, index) => ({
      ...parcela,
      codigo_receber: nextCodigoReceber + index
    }));
    
    console.log(`Próximo código receber: ${nextCodigoReceber}, Total parcelas: ${parcelas.length}`);
    console.log('Códigos gerados:', req.body.parcelas.map(p => p.codigo_receber));

    next();
  } catch (error) {
    console.error('Erro no autoIncrement:', error);
    res.status(500).json({ error: error.message });
  }
}

module.exports = autoIncrementreceber;