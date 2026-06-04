// debemos construir metodos que tengan la siguientes funcionalidades
// Método	Responsabilidad

// addClient(socket, username)	Registrar conexión, notificar a otros
// removeClient(socket)	Limpiar desconexión, notificar a otros
// handleMessage(socket, rawData)	Parsear, validar, crear ChatMessage, guardar, broadcast
// broadcast(message)	Enviar a TODOS los conectados
// getHistory()	Devolver últimos N mensajes


import { WebSocket } from 'ws'
import { ChatMessage, ChatClient, TypesMessage, BufferExpected } from './types.js'
import { ChatMessageDTO } from './dtos/dto.chatMessage.js';
import { Value } from '@sinclair/typebox/value'

export class ChatService {
    // Mapa: socket → datos del cliente
    private clients = new Map<WebSocket, ChatClient>()
    // Historial en memoria (últimos 50 mensajes)
    private messages: ChatMessage[] = []
    // Historial máximo para evitar memory leak
    private readonly MAX_HISTORY = 50

    onMessage(socket: WebSocket, Buffer: Buffer){
        const clientExist = this.clients.has(socket)
        // const rawData = JSON.parse(Buffer.toString())
        const bufferParsed: BufferExpected | null  = this.BufferParse(socket, Buffer)
        if(!bufferParsed){
            socket.send(JSON.stringify({
                type: 'error',
                error: { code: 'Server falied', message: 'server cannot get messages' }
            }))
            return 
        }
        if(clientExist){
            this.handleMessage(socket, bufferParsed)
        }else{
            this.addClient(socket, bufferParsed)
        }
    }


    //sender is the current user
    private broadcast(message: ChatMessage, sender?: WebSocket): void {
        for (const [socket, _client] of this.clients) {
            if (socket !== sender && socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify(message))
            }
        }
    }


    private handleMessage(socket: WebSocket, response: BufferExpected | {text: string, nickname: string}) {
        //check request for client with dto
        if (!Value.Check(ChatMessageDTO, response)) {
            socket.send(JSON.stringify({
                type: 'error',
                error: { code: 'VALIDATION', message: 'Campos inválidos' }
            }))
            return
        }
    
        const msg: ChatMessage = {
            id: crypto.randomUUID(),
            text: response.text,
            nickname: response.nickname,
            timestamp: Date.now(),
            type: TypesMessage.message
        }

        this.messages.push(msg)
        if(this.messages.length > this.MAX_HISTORY){
            this.messages.shift()
        }

        this.broadcast(msg, socket)

    }


    private addClient(socket: WebSocket, {nickname}: {nickname: string}) {
        const client = {
            nickname,
            joinedAt: Date.now()
        }
        //add client to the system 
        this.clients.set(socket, client)

        // Mensaje de sistema avisando que alguien se unió
        const systemMsg: ChatMessage = {
            id: crypto.randomUUID(),
            text: `${nickname} has entered the room`,
            nickname,
            timestamp: Date.now(),
            type: TypesMessage.system
        }
        this.messages.push(systemMsg)
        if(this.messages.length > this.MAX_HISTORY){
            this.messages.shift()
        }

        this.broadcast(systemMsg, socket)
        return systemMsg
    }


    // dele
    // teClient(socket: WebSocket, nickname: string){
    //     const client = this.clients.get(socket)
    //     if (!client) {
    //         throw new Error("Client session cannot be reached, try again later.")
    //     }
    // }


    BufferParse(socket: WebSocket, rawdata: Buffer ): BufferExpected | null{
        let response;
        // unknown;
        if(Buffer.isBuffer(response)){
            console.log("es buffer")
        }
        // if(Buffer.isBuffer(response)){
            try {
                response = JSON.parse(rawdata.toString())
                return response
            } catch {
                socket.send(JSON.stringify({
                    type: 'error',
                    error: { code: 'INVALID_JSON', message: 'El mensaje no es JSON válido' }
                }))
                return null
            }
        // }
    }
}