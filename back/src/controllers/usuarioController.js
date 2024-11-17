const User = require('../models/user.model');
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

exports.createUser = async (req, res) => {
  const { name, email, password, acesso_loja, type, permissions } = req.body;

  try {
    // Verifica se o usuário já existe pelo email
    const existingUser = await User.findOne({ email });
    
    if (existingUser) {
      return res.status(400).json({ message: 'Usuário já cadastrado' });
    }
    // Cria o novo usuário com todos os campos
    const user = new User({
      name,
      email,
      password: hashedPassword,
      acesso_loja,
      type,
      permissions
    });

    await user.save();
    
    // Retorna o usuário e o token
    res.status(201).json({ user, token });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Busca o usuário no banco de dados pelo email
    const user = await User.findOne({ email });

    // Verifica se o usuário foi encontrado
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado' });
    }

    // Compara a senha fornecida com a senha criptografada no banco (campo correto é `password`)
    const isMatch = await bcrypt.compare(senha, user.password);

    // Verifica se a senha está correta
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha inválida' });
    }

    // Gera um token JWT
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET
    );

    // Remove a senha do objeto de resposta
    const { password, ...userWithoutPassword } = user.toObject();

    // Retorna o token e os detalhes do usuário
    res.status(200).json({ token, user: userWithoutPassword });
  } catch (err) {
    console.error(err); // Adiciona um log para verificar o erro exato
    res.status(500).json({ message: 'Erro, tente novamente' });
  }
};
// Listar todos os usuários
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Obter usuário por ID
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Atualizar usuário
exports.updateUser = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Deletar usuário
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    res.status(200).json({ message: 'Usuário deletado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

