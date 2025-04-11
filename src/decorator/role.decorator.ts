import { SetMetadata } from '@nestjs/common';
import { Role } from 'src/modules/roles/entities/role.entity';

export const Roles = (...roles: Role[]) => SetMetadata('roles', roles)