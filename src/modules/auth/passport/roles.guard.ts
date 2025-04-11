import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Role } from 'src/modules/roles/entities/role.entity';


@Injectable()
export class RolesGuard implements CanActivate {
    constructor(
        private reflector: Reflector,
        private jwtAuthGuard: JwtAuthGuard,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        // First, run the JwtAuthGuard to ensure the user is authenticated
        const isAuthenticated = await this.jwtAuthGuard.canActivate(context);
        if (!isAuthenticated) {
            return false;
        }

        const roles = this.reflector.get<Role[]>('roles', context.getHandler());
        if (!roles) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        if (user && roles.includes(user.role)) {
            return true;
        }

        throw new ForbiddenException('You do not have permission to perform this action');
    }
}