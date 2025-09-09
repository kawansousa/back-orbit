const User = require("../models/user.model");
const { Role } = require("../models/role.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

exports.loginUser = async (req, res) => {
  try {
    const { email, senha } = req.body;
    const user = await User.findOne({ email }).populate("role");

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    if (user.status === "inativo") {
      return res.status(401).json({ message: "Usuário inativo. Contate o administrador." });
    }

    if (user.role && user.role.status === 'inativo') {
      return res.status(401).json({ message: "Sua função de usuário está inativa. Contate o administrador." });
    }

    const isMatch = await bcrypt.compare(senha, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    const payload = {
      id: user._id,
      email: user.email,
      permissions: user.role ? user.role.permissions : [],
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET);
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({ token, user: userResponse });
  } catch (err) {
    console.error("Erro no login:", err);
    res.status(500).json({ message: "Erro interno, tente novamente." });
  }
};

exports.createUser = async (req, res) => {
  const { name, email, password, acesso_loja, roleId } = req.body;
  try {
    if (!name || !email || !password || !roleId || !acesso_loja) {
      return res.status(400).json({
        message:
          "Todos os campos, incluindo função e acesso à loja, são obrigatórios.",
      });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Usuário já cadastrado com este e-mail." });
    }
    const role = await Role.findById(roleId);
    if (!role) {
      return res
        .status(400)
        .json({ message: "A Função (Role) especificada não existe." });
    }
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      acesso_loja,
      role: roleId,
      status: "ativo",
    });
    await user.save();
    const userResponse = user.toObject();
    delete userResponse.password;
    res.status(201).json({ user: userResponse });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUsers = async (req, res) => {
  const { codigo_empresas, codigo_loja } = req.query;
  try {
    if (!codigo_empresas || !codigo_loja) {
      return res
        .status(400)
        .json({ error: "Código de empresa e loja são obrigatórios" });
    }
    const users = await User.find({
      acesso_loja: {
        $elemMatch: {
          codigo_loja: codigo_loja,
          "codigo_empresas.codigo": codigo_empresas,
        },
      },
    }).populate("role", "name");
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate("role");
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateUser = async (req, res) => {
  const { name, email, password, roleId } = req.body;
  const { id } = req.params;

  try {
    const updateData = { name, email };

    if (password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(password, salt);
    }

    if (roleId) {
      const role = await Role.findById(roleId);
      if (!role) {
        return res
          .status(400)
          .json({ message: "A Função (Role) especificada não existe." });
      }
      updateData.role = roleId;
    }

    const user = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).populate("role", "name");

    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json(userResponse);
  } catch (error) {
    if (error.code === 11000) {
      return res
        .status(400)
        .json({ message: "Este e-mail já está em uso por outro usuário." });
    }
    res.status(500).json({ error: error.message });
  }
};

exports.inactiveUser = async (req, res) => {
  const { _id } = req.body;
  const requesterId = req.user.id;

  try {
    if (!_id) {
      return res.status(400).json({
        error: "O campo ID é obrigatório",
      });
    }

    if (_id === requesterId) {
      return res.status(403).json({
        error: "Ação não permitida. Você não pode desativar a si mesmo.",
      });
    }

    const userToInactivate = await User.findById(_id).populate('role');
    const requester = await User.findById(requesterId).populate('role');

    if (!userToInactivate || !requester) {
        return res.status(404).json({ error: "Usuário não encontrado." });
    }

    if (userToInactivate.role && requester.role && userToInactivate.role.id === requester.role.id) {
        return res.status(403).json({
            error: "Ação não permitida. Você não pode desativar um usuário com a mesma função.",
        });
    }

    const inactivatedUser = await User.findOneAndUpdate(
      { _id },
      { status: "inativo" },
      { new: true }
    );

    if (!inactivatedUser) {
      return res.status(404).json({
        error: "ID não encontrado",
      });
    }

    res.status(200).json({
      message: "Status do usuario atualizado para inativo",
      usuario: inactivatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};