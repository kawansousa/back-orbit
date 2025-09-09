const { Role } = require("../models/role.model");
const User = require("../models/user.model");

exports.createRole = async (req, res) => {
  try {
    const { name, description, permissions, codigo_loja, codigo_empresa } =
      req.body;
    if (!name || !codigo_loja || !codigo_empresa) {
      return res.status(400).json({
        message:
          "Nome da função, código da loja e da empresa são obrigatórios.",
      });
    }
    const existingRole = await Role.findOne({
      name,
      codigo_loja,
      codigo_empresa,
    });
    if (existingRole) {
      return res.status(409).json({
        message: "Uma função com este nome já existe para esta empresa.",
      });
    }
    const newRole = new Role({
      name,
      description,
      permissions,
      codigo_loja,
      codigo_empresa,
      status: "ativo"
    });
    await newRole.save();
    res
      .status(201)
      .json({ message: "Função criada com sucesso.", role: newRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;
    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ message: "Código da loja e da empresa são obrigatórios." });
    }
    const roles = await Role.find({ codigo_loja, codigo_empresa });
    res.status(200).json(roles);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRoleById = async (req, res) => {
  try {
    const { codigo_loja, codigo_empresa } = req.query;
    const roleId = req.params.id;
    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ message: "Código da loja e da empresa são obrigatórios." });
    }
    const role = await Role.findOne({
      _id: roleId,
      codigo_loja,
      codigo_empresa,
    });
    if (!role) {
      return res
        .status(404)
        .json({ message: "Função não encontrada nesta empresa." });
    }
    res.status(200).json(role);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateRole = async (req, res) => {
  try {
    const { name, description, permissions, codigo_loja, codigo_empresa } =
      req.body;
    const roleId = req.params.id;
    if (!codigo_loja || !codigo_empresa) {
      return res
        .status(400)
        .json({ message: "Código da loja e da empresa são obrigatórios." });
    }
    const updatedRole = await Role.findOneAndUpdate(
      { _id: roleId, codigo_loja, codigo_empresa },
      { name, description, permissions },
      { new: true, runValidators: true }
    );
    if (!updatedRole) {
      return res
        .status(404)
        .json({ message: "Função não encontrada nesta empresa." });
    }
    res
      .status(200)
      .json({ message: "Função atualizada com sucesso.", role: updatedRole });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteRole = async (req, res) => {
  try {
    const { _id } = req.body;
    const requesterId = req.user.id;

    if (!_id) {
      return res.status(400).json({
        error: "O campo ID é obrigatório",
      });
    }

    const requester = await User.findById(requesterId);
    if (requester && requester.role.toString() === _id) {
        return res.status(403).json({
            error: "Ação não permitida. Você não pode desativar sua própria função.",
        });
    }

    const deletedRole = await Role.findByIdAndUpdate(
      { _id },
      { status: "inativo" },
      { new: true }
    );

    if (!deletedRole) {
      return res.status(404).json({
        error: "ID não encontrado",
      });
    }

    res.status(200).json({
      message: "Status da função ataulizado para inativo",
      role: deletedRole,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};