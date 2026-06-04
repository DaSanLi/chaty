export interface ChatMessage {
    id: string;
    text: string;
    timestamp: number;
    nickname: string;
    type: TypesMessage;
    error?: ChatError;
}

export interface ChatError {
    code: string
    message: string
}

export interface User {
    id: string;
    nickname: string;
}

export interface ChatClient {
    nickname: string;
    joinedAt: number
}

export interface BufferExpected {
    text: string;
    nickname: string;
}


export enum TypesMessage {
    join='join',
    leave='leave',
    message='message',
    error='error',
    // this type warn about an event into the connection like ( an user has joined to the room )
    system='system'
}

