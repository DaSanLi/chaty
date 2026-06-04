import { Type } from '@sinclair/typebox';


export const ChatMessageDTO = Type.Object({
  text: Type.String({ minLength: 1, maxLength: 500 }),
  nickname: Type.String({ minLength: 1, maxLength: 30 }),
})