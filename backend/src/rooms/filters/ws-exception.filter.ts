import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

/**
 * Global WebSocket exception filter.
 *
 * Catches all exceptions thrown in gateway handlers and sends a structured
 * error event back to the client that triggered the error.
 *
 * For WsException: sends the error message to the client.
 * For unexpected errors: logs the stack trace and sends a generic message.
 *
 * This is the WebSocket equivalent of the HTTP ExceptionFilter pattern
 * required by the NestJS skill conventions.
 */
@Catch()
export class WsExceptionFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const client = host.switchToWs().getClient<Socket>();

    if (exception instanceof WsException) {
      const error = exception.getError();
      const message =
        typeof error === 'string'
          ? error
          : (error as { message?: string }).message ?? 'Unknown error';

      client.emit('error', {
        message,
        timestamp: new Date().toISOString(),
      });

      this.logger.warn(
        `WsException sent to client ${client.id}: "${message}"`,
      );
    } else {
      // Unexpected error — log full details, send generic response
      this.logger.error(
        `Unexpected error for client ${client.id}`,
        exception instanceof Error ? exception.stack : exception,
      );

      client.emit('error', {
        message: 'Internal server error',
        timestamp: new Date().toISOString(),
      });
    }

    // Let NestJS handle the exception internally (cleanup, logging, etc.)
    super.catch(exception, host);
  }
}
