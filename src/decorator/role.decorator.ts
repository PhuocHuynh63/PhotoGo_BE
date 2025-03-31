import { SetMetadata } from '@nestjs/common';
import { UserRoles } from 'src/constants/user.enum';

export const Roles = (...roles: UserRoles[]) => SetMetadata('roles', roles);