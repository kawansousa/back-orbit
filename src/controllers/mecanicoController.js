const Mecanico = require("../models/mecanico.model");
const Os = require("../models/os.model");

exports.listaMecanicos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, page, limit, searchTerm, searchType } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const pageNumber = parseInt(page, 10) || 1;
    const limitNumber = parseInt(limit, 10) || 10;

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        error: "Os valores de page e limit devem ser maiores que 0.",
      });
    }

    const skip = (pageNumber - 1) * limitNumber;

    const filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm) {
      if (searchType === 'todos') {
        filtros.$or = [
          { nome: { $regex: searchTerm, $options: 'i' } },
          { especialidade: { $regex: searchTerm, $options: 'i' } },
          { telefone: { $regex: searchTerm, $options: 'i' } },
        ];
      } else {
        filtros[searchType] = { $regex: searchTerm, $options: 'i' };
      }
    }

    const mecanicos = await Mecanico.find(filtros)
      .skip(skip)
      .limit(limitNumber);

    const totalMecanicos = await Mecanico.countDocuments(filtros);

    res.status(200).json({
      total: totalMecanicos,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalMecanicos / limitNumber),
      data: mecanicos,
    });
  } catch (error) {
    console.error("Erro ao listar mecânicos:", error); 
    res.status(500).json({ error: error.message });
  }
};



exports.createMecanico = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      nome,
      especialidade,
      telefone,
      comissao,
      status,
      codigo_mecanico,
    } = req.body;

    if (!codigo_loja || !codigo_empresa || !nome) {
      return res.status(400).json({
        error: "Os campos codigo_loja, codigo_empresa e nome são obrigatórios.",
      });
    }

    const novoMecanico = new Mecanico({
      codigo_loja,
      codigo_empresa,
      codigo_mecanico,
      nome,
      comissao,
      especialidade,
      telefone,
      status: status || "ativo",
      data_criacao: new Date(),
      data_atualizacao: new Date(),
    });

    await novoMecanico.save();

    res.status(201).json({
      message: "Mecânico criado com sucesso",
      mecanico: novoMecanico,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMecanicosById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const mecanico = await Mecanico.findOne({
      codigo_mecanico: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    if (!mecanico) {
      return res.status(404).json({
        error: "Mecanico não encontrado para essa loja e empresa.",
      });
    }

    res.status(200).json(mecanico);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateMecanico = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, nome, especialidade, telefone, comissao, status } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    if (!nome && !especialidade && !telefone && comissao === undefined && !status) {
      return res.status(400).json({
        error: "Pelo menos um campo deve ser fornecido para atualização.",
      });
    }

    if (nome && nome.trim() === "") {
      return res.status(400).json({ error: "Nome não pode estar vazio" });
    }

    if (especialidade && especialidade.trim() === "") {
      return res.status(400).json({ error: "Especialidade não pode estar vazia" });
    }

    if (comissao !== undefined && (isNaN(comissao) || comissao < 0 || comissao > 100)) {
      return res.status(400).json({ error: "Comissão deve estar entre 0 e 100" });
    }

    const updateData = {
      data_atualizacao: new Date(),
    };

    if (nome) updateData.nome = nome.trim();
    if (especialidade) updateData.especialidade = especialidade.trim();
    if (telefone) updateData.telefone = telefone.trim();
    if (comissao !== undefined) updateData.comissao = Number(comissao);
    if (status) updateData.status = status;

    const updatedMecanico = await Mecanico.findOneAndUpdate(
      { codigo_mecanico: req.params.id, codigo_loja, codigo_empresa },
      updateData,
      { new: true }
    );

    if (!updatedMecanico) {
      return res.status(404).json({
        error: "Mecânico não encontrado para essa loja e empresa.",
      });
    }

    res.status(200).json({
      message: "Mecânico atualizado com sucesso",
      mecanico: updatedMecanico,
    });
  } catch (error) {
    console.error("Erro ao atualizar mecânico:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteMecanico = async (req, res) => {
  const { codigo_loja, codigo_empresa, codigo_mecanico } = req.body;

  try {
    if (!codigo_loja || !codigo_empresa || !codigo_mecanico) {
      return res.status(400).json({
        error:
          "Os campos codigo_loja, codigo_empresa e codigo_mecanico são obrigatórios.",
      });
    }

    const updatedMecanico = await Mecanico.findOneAndUpdate(
      { codigo_mecanico, codigo_loja, codigo_empresa },
      { status: "inativo" },
      { new: true }
    );

    if (!updatedMecanico) {
      return res.status(404).json({
        error: "O Mecanico não foi encontrado nessa loja e empresa.",
      });
    }

    res.status(200).json({
      message: "Status do mecânico atualizado para inativo",
      mecanico: updatedMecanico,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.relatorioMecanicos = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa, data_inicio, data_fim } = req.query;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: "Os campos codigo_loja e codigo_empresa são obrigatórios.",
      });
    }

    const adicionarZeroEsquerda = (n) =>
      String(n).padStart(2, "0");

    const formatarDataParaYMD = (data) =>
      `${data.getFullYear()}-${adicionarZeroEsquerda(data.getMonth() + 1)}-${adicionarZeroEsquerda(data.getDate())}`;

    const dataHoje = new Date();
    const dataTrintaDiasAtras = new Date();
    dataTrintaDiasAtras.setDate(dataHoje.getDate() - 30);

    const dataInicioSelecionada =
      typeof data_inicio === "string" && data_inicio
        ? data_inicio
        : formatarDataParaYMD(dataTrintaDiasAtras);

    const dataFimSelecionada =
      typeof data_fim === "string" && data_fim
        ? data_fim
        : formatarDataParaYMD(dataHoje);

    const dataInicioFiltro = new Date(`${dataInicioSelecionada}T00:00:00.000Z`);
    const dataFimFiltro = new Date(`${dataFimSelecionada}T23:59:59.999Z`);

    const mecanicos = await Mecanico.find({
      codigo_loja,
      codigo_empresa,
      status: "ativo",
    });

    const ordensServico = await Os.find({
      codigo_loja,
      codigo_empresa,
      status: "faturado",
      dataAbertura: { $gte: dataInicioFiltro, $lte: dataFimFiltro },
    }).populate('cliente', 'nome'); 

    const relatorio = await Promise.all(
      mecanicos.map(async (mecanico) => {
        const ordensServicoAtendidas = [];
        let valorTotalServicos = 0;
        let quantidadeServicos = 0;

        ordensServico.forEach((os) => {
          if (os.servicos && os.servicos.length > 0) {
            let mecanicoAtendeuEssaOS = false;

            os.servicos.forEach((servico) => {
              if (servico.mecanico && Array.isArray(servico.mecanico)) {
                const encontrouMecanico = servico.mecanico.find(
                  (m) =>
                    m.nome === mecanico.nome ||
                    m.codigo_mecanico === mecanico.codigo_mecanico
                );
                if (encontrouMecanico) {
                  mecanicoAtendeuEssaOS = true;
                  valorTotalServicos += servico.total_servico || 0;
                  quantidadeServicos++;
                }
              }
            });

            if (mecanicoAtendeuEssaOS) {
              ordensServicoAtendidas.push(os);
            }
          }
        });

        const valorComissao =
          (valorTotalServicos * (mecanico.comissao || 0)) / 100;

        return {
          codigo_mecanico: mecanico.codigo_mecanico,
          nome: mecanico.nome,
          especialidade: mecanico.especialidade,
          telefone: mecanico.telefone,
          comissao_percentual: mecanico.comissao || 0,
          quantidade_servicos: quantidadeServicos,
          valor_total_servicos: valorTotalServicos,
          valor_comissao: valorComissao,
          os_detalhes: ordensServicoAtendidas.map((os) => {
            const servicosDoMecanico = os.servicos.filter(
              (servico) =>
                servico.mecanico &&
                Array.isArray(servico.mecanico) &&
                servico.mecanico.find(
                  (m) =>
                    m.nome === mecanico.nome ||
                    m.codigo_mecanico === mecanico.codigo_mecanico
                )
            );

            const obterNomeCliente = () => {
              if (os.cliente && typeof os.cliente === 'object' && os.cliente.nome) {
                return os.cliente.nome;
              }
              if (os.cliente_sem_cadastro && os.cliente_sem_cadastro.nome) {
                return os.cliente_sem_cadastro.nome;
              }
              return "Cliente não informado";
            };

            return {
              codigo_os: os.codigo_os,
              cliente: obterNomeCliente(),
              data_fechamento: os.dataFechamento || os.dataAbertura,
              valor_total:
                servicosDoMecanico.reduce(
                  (soma, serv) => soma + (serv.total_servico || 0),
                  0
                ) || 0,
              servicos_realizados: servicosDoMecanico.map((servico) => ({
                codigo_servico: servico.codigo_servico,
                descricao: servico.descricao,
                quantidade: servico.quantidade,
                valor_unitario: servico.preco,
                valor_total: servico.total_servico,
              })),
            };
          }),
        };
      })
    );

    relatorio.sort((a, b) => b.valor_comissao - a.valor_comissao);

    const totaisGerais = {
      total_mecanicos: relatorio.length,
      total_servicos: relatorio.reduce(
        (soma, m) => soma + m.quantidade_servicos,
        0
      ),
      total_valor_servicos: relatorio.reduce(
        (soma, m) => soma + m.valor_total_servicos,
        0
      ),
      total_comissoes: relatorio.reduce(
        (soma, m) => soma + m.valor_comissao,
        0
      ),
    };

    res.status(200).json({
      periodo: {
        data_inicio: dataInicioSelecionada,
        data_fim: dataFimSelecionada,
      },
      totais: totaisGerais,
      mecanicos: relatorio,
    });
  } catch (error) {
    console.error("Erro ao gerar relatório de mecânicos:", error);
    res.status(500).json({ error: error.message });
  }
};
