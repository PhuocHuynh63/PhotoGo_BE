import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Injectable()
export class WsJwtGuard implements CanActivate {
    constructor(private jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        try {
            const client: Socket = context.switchToWs().getClient();
            const token = client.handshake.auth.token || client.handshake.query.token;

            if (!token) {
                throw new WsException('Token not provided');
            }

            const payload = this.jwtService.verify(token as string);

            // Attach user info to socket for later use
            client.data.user = payload;

            return true;
        } catch (err) {
            throw new WsException('Invalid token');
        }
    }
} 