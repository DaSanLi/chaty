'use strict'
import { FastifyPluginAsync } from 'fastify'
import type { FastifyRequest } from 'fastify'
import type { WebSocket } from 'ws'
import { ChatService } from './service';

const chat: FastifyPluginAsync = async ( fastify, opts ): Promise<void> => {
    const chatService = new ChatService()

    fastify.get('/', {websocket: true}, (socket: WebSocket, req: FastifyRequest) => { 
        socket.on('message', (message: Buffer) => {
            chatService.onMessage(socket, message)
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