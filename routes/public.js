import express from "express"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

const router = express.Router()
const prisma = new PrismaClient()
const JWT_SECREY = process.env.JWT_SECREY

//cadastro
router.post('/cadastro', async (req, res) => {
  try {
    const user = req.body

    const salt = await bcrypt.genSalt(10)
    const hashPassword = await bcrypt.hash(user.password, salt)

    const userDb = await prisma.user.create({
      data: {
        email: user.email,
        name: user.name,
        password: hashPassword
      }
    })

    res.status(201).json(userDb);
  } catch (err) {
    res.status(500).json({ message: 'Erro tente novamente' })
  }
})

router.post('/login', async (req, res) => {
  try {
    const userInfo = req.body

    //Busca usuario no banco de dados
    const user = await prisma.user.findUnique({
      where: { email: userInfo.email }
    })

    //Verifica se o usuário existe
    if (!user) {
      return res.status(404).json({ message: 'Usuario não encontrado' })
    }

    //compara as senhas
    const isMatch = await bcrypt.compare(userInfo.password, user.password)

    //verifica se qa senha está correta
    if (!isMatch) {
      return res.status(400).json({ message: 'Senha invalida' })
    }

    //gerar o token jwt
    const token = jwt.sign({id : user.id} , JWT_SECREY, {expiresIn : '1m'})

    res.status(200).json(token)

  } catch (err) {
    res.status(500).json({ message: 'Erro tente novamente' })
  }

})


export default router