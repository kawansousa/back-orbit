import express from "express"
import { PrismaClient } from "@prisma/client"

const router = express.Router()
const prisma = new PrismaClient()

router.get('/listar-usuarios', async (req, res) => {
  try {
    const user = await prisma.user.findMany()
    res.status(200).json({users : user})

  } catch (error) {
    res.status(500).json({ message: 'Falaha no servidor' })
  }
})

export default router