import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from 'src/modules/users/entities/user.entity';
import { UserStatus } from 'src/constants/user.enum';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
    constructor(private authService: AuthService) {
        super({ usernameField: 'email' });
    }

    async validate(email: string, password: string): Promise<any> {
        const user = await this.authService.validateUser(email, password);

        if (user.status != 'hoạt động') {
            if (user.status == UserStatus.BANNED) {
                throw new UnauthorizedException('Tài khoản đã bị chặn vui lòng liên hệ với quản trị viên');
            }
            if (user.status == UserStatus.INACTIVE) {
                throw new UnauthorizedException('Tài khoản chưa được kích hoạt vui lòng kiểm tra email');
            }
        }
        return user;
    }
}