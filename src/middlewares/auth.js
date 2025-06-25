const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET

const   auth = (req, res, next) => {
  const token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado' })
  }

  try {
    const deCoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECRET)

    req.userId = deCoded.id

  } catch (error) {
    return res.status(401).json({ message: 'Token invalido' })
  }
  next()
}

module.exports = auth;