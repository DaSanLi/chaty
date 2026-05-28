'use strict'
import { FastifyPluginAsync } from 'fastify'
import type { FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'

const chat: FastifyPluginAsync = async ( fastify, opts ): Promise<void> => {


    fastify.get('/', {websocket: true}, (socket: WebSocket, req: FastifyRequest) => { 
        socket.on('message', (message: Buffer) => {
            // message from frontend
            const messageTransform = message.toString();
            console.log(`recibí el siguiente mensaje: ${messageTransform}`)
            socket.send("hi from server")
        })

        socket.on('close', (code, reason)=>{
            console.log(`client has gone, ${code}, and reason ${reason}`)
        })

        socket.on('error', (err) => {
            console.log(`server found the following error: ${err.message}, and its reasin ${err.cause}`)
        })
    })
}

export default chat