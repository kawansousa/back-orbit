import jwt from "jsonwebtoken"

const JWT_SECREY = process.env.JWT_SECREY

const auth = (req, res, next) => {
  const token = req.headers.authorization

  if (!token) {
    return res.status(401).json({ message: 'Acesso negado' })
  }

  try {
    const deCoded = jwt.verify(token.replace('Bearer ', ''), JWT_SECREY)

    req.userId = deCoded.id

  } catch (error) {
    return res.status(401).json({ message: 'Token invalido' })
  }
  next()
}

export default auth