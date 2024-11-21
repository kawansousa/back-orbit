const Cliente = require('../models/clientes.model');


exports.createCliente = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      codigo_cliente,
      nome,
      apelido,
      cpf,
      cnpj,
      ie,
      rg,
      fone,
      fone_secundario,
      email,
      tipo,
      endereco,
      conjugue,
    } = req.body;

    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.',
      });
    }

    // Verificar duplicidade
    const clienteExistente = await Cliente.findOne({
      codigo_loja,
      codigo_empresa,
      $or: [
        {
          $and: [
            { cnpj: { $ne: "nao informado" } },
            { cnpj: { $ne: "" } },
            { cnpj },
          ],
        },
        {
          $and: [
            { cpf: { $ne: "nao informado" } },
            { cpf: { $ne: "" } },
            { cpf },
          ],
        },
        {
          $and: [
            { ie: { $ne: "nao informado" } },
            { ie: { $ne: "" } },
            { ie },
          ],
        },
        {
          $and: [
            { rg: { $ne: "nao informado" } },
            { rg: { $ne: "" } },
            { rg },
          ],
        },
      ],
    });

    if (clienteExistente) {
      if (clienteExistente.cpf === cpf || clienteExistente.cnpj === cnpj) {
        return res.status(409).json({
          error: "Já existe um cliente cadastrado com esse CPF ou CNPJ.",
        });
      } else if (clienteExistente.rg === rg || clienteExistente.ie === ie) {
        return res.status(409).json({
          error: "Já existe um cliente cadastrado com esse RG ou IE.",
        });
      }
    }
    // Validar formato de email
    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return res.status(400).json({ error: 'Formato de email inválido.' });
    }


    const novoCliente = new Cliente({
      codigo_loja,
      codigo_empresa,
      codigo_cliente,
      nome,
      apelido,
      cpf,
      cnpj,
      ie,
      rg,
      fone,
      fone_secundario,
      email,
      tipo,
      endereco,
      conjugue,

    });

    await novoCliente.save();

    res.status(201).json({
      message: 'Cliente criado com sucesso',
      cliente: novoCliente,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getClientes = async (req, res) => {
  try {
    const {
      codigo_loja,
      codigo_empresa,
      page,
      limit,
      searchTerm,
      searchType
    } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    // Convert pagination parameters
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (pageNumber < 1 || limitNumber < 1) {
      return res.status(400).json({
        error: 'Os valores de page e limit devem ser maiores que 0.'
      });
    }

    // Calculate skip
    const skip = (pageNumber - 1) * limitNumber;

    // Build filters
    let filtros = {
      codigo_loja,
      codigo_empresa,
    };

    if (searchTerm) {
      if (searchType === 'todos') {
        filtros.$or = [
          { nome: { $regex: searchTerm, $options: 'i' } },
          { cpf: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } }
        ];
      } else {
        // Specific field search
        switch (searchType) {
          case 'nome':
          case 'cpf':
          case 'email':
            filtros[searchType] = { $regex: searchTerm, $options: 'i' };
            break;
        }
      }
    }

    // Query with pagination and filters
    const clientes = await Cliente.find(filtros)
      .skip(skip)
      .limit(limitNumber);

    // Total clients for pagination
    const totalClientes = await Cliente.countDocuments(filtros);

    if (clientes.length === 0) {
      return res.status(404).json({
        message: 'Nenhum cliente encontrado para os filtros fornecidos.'
      });
    }

    // Return clients with pagination info
    res.status(200).json({
      total: totalClientes,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(totalClientes / limitNumber),
      data: clientes,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getClientesById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;

    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    // Find client by ID, validating store and company
    const cliente = await Cliente.findOne({
      _id: req.params.id,
      codigo_loja,
      codigo_empresa,
    });

    // Check if client was found
    if (!cliente) {
      return res.status(404).json({
        error: 'Cliente não encontrado para essa loja e empresa.'
      });
    }

    // Return found client
    res.status(200).json(cliente);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCliente = async (req, res) => {
  const { codigo_loja, codigo_empresa, nome } = req.body;

  try {
    // Validate mandatory parameters
    if (!codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        error: 'Os campos codigo_loja e codigo_empresa são obrigatórios.'
      });
    }

    // Validate name if present
    if (nome !== undefined && nome.trim() === '') {
      return res.status(400).json({ error: 'Preencha o nome' });
    }

    // Update client, validating store and company
    const updatedCliente = await Cliente.findOneAndUpdate(
      { _id: req.params.id, codigo_loja, codigo_empresa },
      req.body,
      { new: true }
    );

    // Check if client was found and updated
    if (!updatedCliente) {
      return res.status(404).json({
        error: 'Cliente não encontrado para essa loja e empresa.'
      });
    }

    // Return updated client
    res.status(200).json({
      message: 'Cliente atualizado',
      cliente: updatedCliente
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCliente = async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente não encontrado' });
    }
    res.status(200).json({ message: 'Cliente removido com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};