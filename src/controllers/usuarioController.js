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
      return res
        .status(400)
        .json({
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
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    res.status(200).json({ message: "Usuário deletado com sucesso" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
