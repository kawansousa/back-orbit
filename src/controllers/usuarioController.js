const User = require("../models/user.model");
const { Role } = require("../models/role.model");
const RefreshToken = require("../models/refreshToken.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const logger = require("../utils/logger");

// ─── Helpers ────────────────────────────────────────────────

const ACCESS_TOKEN_EXPIRY = "15m";
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutos
const REFRESH_TOKEN_MAX_AGE = REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000; // 7 dias

// Opções de cookie: em produção é cross-site (app em domínio diferente da API),
// então precisa de sameSite "none" + secure. Em dev, "lax" sobre http funciona.
function cookieOptions(maxAge) {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    maxAge,
  };
}

function generateAccessToken(user) {
  const payload = {
    id: user._id,
    email: user.email,
    permissions: user.role ? user.role.permissions : [],
    acesso_loja: user.acesso_loja
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

async function generateRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString("hex");

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

  await RefreshToken.create({ token, userId, expiresAt });

  return token;
}

// ─── Login ──────────────────────────────────────────────────

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

    if (user.role && user.role.status === "inativo") {
      return res.status(401).json({ message: "Sua função de usuário está inativa. Contate o administrador." });
    }

    const isMatch = await bcrypt.compare(senha, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user._id);

    const userResponse = user.toObject();
    delete userResponse.password;

    // ACCESS TOKEN COOKIE
    res.cookie("accessToken", accessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));

    // REFRESH TOKEN COOKIE
    res.cookie("refreshToken", refreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

    res.status(200).json({
      message: "Login realizado com sucesso",
      token: accessToken,
      refreshToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: {
          name: user.role ? user.role.name : null,
          permissions: user.role ? user.role.permissions : []
        },
        acesso_loja: user.acesso_loja
      }
    });

  } catch (err) {
    logger.error({ err }, "Erro no login");
    res.status(500).json({ message: "Erro interno, tente novamente." });
  }
};

// ─── Refresh Token ──────────────────────────────────────────

exports.refreshToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    console.log("Refresh token recebido:", refreshToken);

    if (!refreshToken) {
      return res.status(401).json({ error: "Refresh token não encontrado" });
    }

    // Busca o refresh token no banco
    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    if (!storedToken) {
      return res.status(401).json({ message: "Refresh token inválido." });
    }

    // Verifica se expirou
    if (storedToken.expiresAt < new Date()) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      return res.status(401).json({ message: "Refresh token expirado. Faça login novamente." });
    }

    // Busca o usuário
    const user = await User.findById(storedToken.userId).populate("role");

    if (!user) {
      await RefreshToken.deleteOne({ _id: storedToken._id });
      return res.status(401).json({ message: "Usuário não encontrado." });
    }

    if (user.status === "inativo") {
      await RefreshToken.deleteMany({ userId: user._id });
      return res.status(401).json({ message: "Usuário inativo. Contate o administrador." });
    }

    // Rotação: deleta o token antigo e gera um novo
    await RefreshToken.deleteOne({ _id: storedToken._id });

    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = await generateRefreshToken(user._id);

    res.cookie("accessToken", newAccessToken, cookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie("refreshToken", newRefreshToken, cookieOptions(REFRESH_TOKEN_MAX_AGE));

    res.status(200).json({
      token: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  } catch (err) {
    logger.error({ err }, "Erro ao renovar token");
    res.status(500).json({ message: "Erro interno, tente novamente." });
  }
};

// ─── Logout ─────────────────────────────────────────────────

exports.logout = async (req, res) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

    if (refreshToken) {
      await RefreshToken.deleteOne({ token: refreshToken });
    }

    res.clearCookie("accessToken");
    res.clearCookie("refreshToken");

    res.status(200).json({ message: "Logout realizado com sucesso." });
  } catch (err) {
    logger.error({ err }, "Erro no logout");
    res.status(500).json({ message: "Erro interno, tente novamente." });
  }
};

// ─── Logout de todas as sessões ─────────────────────────────

exports.logoutAll = async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await RefreshToken.deleteMany({ userId });

    res.status(200).json({
      message: "Todas as sessões foram encerradas.",
      sessoesEncerradas: result.deletedCount,
    });
  } catch (err) {
    logger.error({ err }, "Erro ao encerrar todas as sessões");
    res.status(500).json({ message: "Erro interno, tente novamente." });
  }
};

// ─── CRUD de Usuários (mantido) ─────────────────────────────

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
  try {
    const {
      codigo_empresas,
      codigo_loja,
      page = 1,
      limit = 10,
      searchTerm,
      searchType,
      sort,
    } = req.query;

    if (!codigo_empresas || !codigo_loja) {
      return res
        .status(400)
        .json({ error: "Código de empresa e loja são obrigatórios." });
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filtros = {
      acesso_loja: {
        $elemMatch: {
          codigo_loja: codigo_loja,
          "codigo_empresas.codigo": codigo_empresas,
        },
      },
    };

    if (searchTerm && searchTerm.trim() !== "") {
      const termo = searchTerm.trim();

      if (searchType === "todos") {
        filtros.$or = [
          { nome: { $regex: termo, $options: "i" } },
          { email: { $regex: termo, $options: "i" } },
          { usuario: { $regex: termo, $options: "i" } },
          { "role.name": { $regex: termo, $options: "i" } },
        ];
      } else {
        switch (searchType) {
          case "nome":
          case "email":
          case "usuario":
            filtros[searchType] = { $regex: termo, $options: "i" };
            break;
          case "role":
            filtros["role.name"] = { $regex: termo, $options: "i" };
            break;
        }
      }
    }

    const sortOptions = {};
    if (sort) {
      sortOptions[sort.startsWith("-") ? sort.substring(1) : sort] =
        sort.startsWith("-") ? -1 : 1;
    } else {
      sortOptions.nome = 1;
    }

    const users = await User.find(filtros)
      .populate("role", "name")
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber);

    const total = await User.countDocuments(filtros);

    if (!users || users.length === 0) {
      return res.status(404).json({
        message: "Nenhum usuário encontrado para os filtros fornecidos.",
        total: 0,
        totalPages: 0,
        data: [],
      });
    }

    return res.status(200).json({
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      data: users,
    });
  } catch (error) {
    logger.error({ error }, "Erro na busca de usuários");
    return res.status(500).json({ error: error.message });
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

    // Inativa o usuário e revoga todos os refresh tokens dele
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

    await RefreshToken.deleteMany({ userId: _id });

    res.status(200).json({
      message: "Status do usuario atualizado para inativo",
      usuario: inactivatedUser,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};