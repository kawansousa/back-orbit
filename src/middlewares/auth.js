const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const JWT_SECRET = process.env.JWT_SECRET;

const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ message: "Acesso negado. Token não fornecido." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).populate('role');

    if (!user) {
        return res.status(401).json({ message: 'Usuário do token não encontrado.' });
    }

    if (user.role && user.role.status === 'inativo') {
        return res.status(403).json({ message: 'Acesso negado. A função do usuário está inativa.' });
    }

    req.user = {
        id: user._id,
        email: user.email,
        permissions: user.role ? user.role.permissions : []
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido ou expirado." });
  }
};

module.exports = auth;