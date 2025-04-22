import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from 'src/modules/users/user.service';

@Injectable()
export class FacebookAuthService {
    constructor(
        private readonly userService: UserService,
        private readonly jwtService: JwtService,
    ) { }

    async validateUser(profile: any): Promise<any> {
        const { facebookId, email, firstName, lastName, avatar } = profile;

        // Kiểm tra xem người dùng đã tồn tại chưa
        let user = await this.userService.findOneEmail(email);
        if (!user) {
            // Nếu chưa tồn tại, tạo người dùng mới
            user = await this.userService.create({
                email,
                fullName: `${firstName} ${lastName}`,
                avatarUrl: avatar,
                auth: 'facebook',
                passwordHash: '', // Default value for passwordHash
            });
        }

        return user;
    }

    async generateJwt(user: any): Promise<string> {
        const payload = { sub: user.id, email: user.email };
        return this.jwtService.sign(payload);
    }
}