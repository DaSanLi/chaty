import Fastify from 'fastify'
import app from './app.js'

const server = Fastify({ logger: true })

async function start() {
  await server.register(app)
  await server.listen({ port: 3000 })
}

start()
