const Loja = require("../models/lojas.model");

module.exports = async function incrementarCodigos(req, res, next) {
  try {
    if (!req.body.codigo_loja) {
      const ultimaLoja = await Loja.findOne()
        .sort({ codigo_loja: -1 })
        .select("codigo_loja")
        .lean();

      const ultimoCodigo = ultimaLoja?.codigo_loja || 0;
      req.body.codigo_loja = parseInt(ultimoCodigo) + 1;

      console.log(
        `Código da loja gerado automaticamente: ${req.body.codigo_loja}`
      );
    }

    if (
      req.body.empresas &&
      Array.isArray(req.body.empresas) &&
      req.body.empresas.length > 0
    ) {
      req.body.empresas.forEach((empresa, index) => {
        if (!empresa.codigo_empresa) {
          empresa.codigo_empresa = (index + 1).toString();

          console.log(
            `Código da empresa ${index + 1} gerado: ${empresa.codigo_empresa}`
          );
        } else {
          empresa.codigo_empresa = empresa.codigo_empresa
            .toString()
            .padStart(3, "0");
        }
      });

      const codigos = req.body.empresas.map((emp) => emp.codigo_empresa);
      const codigosUnicos = [...new Set(codigos)];

      if (codigos.length !== codigosUnicos.length) {
        return res.status(400).json({
          error: "Códigos de empresas duplicados",
          message: "Existem códigos de empresas duplicados na requisição",
          codigos_duplicados: codigos.filter(
            (codigo, index) => codigos.indexOf(codigo) !== index
          ),
        });
      }
    }

    if (
      req.route?.path?.includes("empresa") &&
      req.body.codigo_loja &&
      !req.body.empresas
    ) {
      try {
        const lojaExistente = await Loja.findOne({
          codigo_loja: req.body.codigo_loja,
        })
          .select("empresas.codigo_empresa")
          .lean();

        if (lojaExistente && !req.body.codigo_empresa) {
          const codigosExistentes = lojaExistente.empresas
            .map((emp) => parseInt(emp.codigo_empresa) || 0)
            .filter((codigo) => !isNaN(codigo));

          const maiorCodigo =
            codigosExistentes.length > 0 ? Math.max(...codigosExistentes) : 0;
          req.body.codigo_empresa = (maiorCodigo + 1)
            .toString()
            .padStart(3, "0");

          console.log(
            `Código da nova empresa gerado: ${req.body.codigo_empresa}`
          );
        }
      } catch (empresaError) {
        console.error("Erro ao gerar código da empresa:", empresaError);
        if (!req.body.codigo_empresa) {
          req.body.codigo_empresa = "001";
        }
      }
    }

    next();
  } catch (error) {
    console.error("Erro ao incrementar códigos:", error);

    let errorMessage = "Erro ao gerar códigos automáticos";
    let statusCode = 500;

    if (error.name === "MongoError" || error.name === "MongooseError") {
      errorMessage = "Erro de conexão com banco de dados ao gerar códigos";
    } else if (error.name === "ValidationError") {
      errorMessage = "Erro de validação ao processar códigos";
      statusCode = 400;
    }

    return res.status(statusCode).json({
      error: errorMessage,
      details:
        process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};
