import { Injectable, BadRequestException, UnauthorizedException, ConflictException, NotFoundException, Logger } from '@nestjs/common';
import { comparePasswordHelper, getInitials } from 'src/utils/utils';
import { JwtService } from '@nestjs/jwt';
import { CreateAuthDto } from './dto/create-auth.dto';

import { UserService } from 'src/modules/users/user.service';
import { MailService } from 'src/3rdService/mail/mail.service';
import { UpdateUserDto } from '../users/dto/update-user.dto';
import { RestPasswordhDto } from './dto/rest-password.dto';
import { CartService } from 'src/modules/carts/cart.service';
import { WishlistService } from 'src/modules/wishlists/wishlist.service';
import { CampaignService } from 'src/modules/campaign/campaign.service';
import { NotificationService } from 'src/modules/notifications/notification.service';
import { PointService } from 'src/modules/points/point.service';
import { SubscriptionService } from '../subscription/subscription.service';
import { SubscriptionStatus } from 'src/constants/subscription.enum';
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly cartService: CartService,
    private readonly wishlistService: WishlistService,
    private readonly campaignService: CampaignService,
    private readonly notificationService: NotificationService,
    private readonly pointService: PointService,
    private readonly subscriptionService: SubscriptionService,
  ) { }

  //#region Validate User
  async validateUser(email: string, password: string): Promise<any> {
    const emailLower = email.toLowerCase();
    const user = await this.userService.findOneByEmail(emailLower);
    if (!user) {
      throw new BadRequestException('Tài khoản hoặc mật khẩu không chính xác');
    }

    const isMatch = await comparePasswordHelper(password, user.passwordHash);
    if (!isMatch) {
      throw new BadRequestException('Tài khoản hoặc mật khẩu không chính xác');
    }
    await this.userService.updateLoginAt(user);

    return user;
  }
  //#endregion

  //#region Login
  async login(user: any) {
    const subscription = await this.subscriptionService.findSubscriptionByUserId(user.id, SubscriptionStatus.ACTIVE);

    const payload = {
      email: user.email,
      sub: user.id,
      fullname: user.fullname,
      role: user.role,
      image: user.image,
      subscription: subscription?.id,
    };

    // Lấy cart của user
    const cart = await this.cartService.findCartByUserId(user.id);
    const wishlist = await this.wishlistService.findWishlistByUserId(user.id);

    // Send login notification
    // try {
    //   await this.notificationService.notifyLogin(user, 'Web Browser', 'Email/Password');
    //   this.logger.log(`Login notification sent to user ${user.id}`);
    // } catch (error) {
    //   this.logger.warn(`Failed to send login notification to user ${user.id}: ${error.message}`);
    //   // Không throw error để không ảnh hưởng đến quá trình đăng nhập
    // }

    return {
      user: {
        id: user.id,
        email: user.email,
        fullname: user.fullname,
        image: user.image,
        role: user.role,
        cartId: cart?.id || null, // Thêm cartId vào đây
        wishlistId: wishlist?.id || null, // Thêm wishlistId vào đây
        subscriptionId: subscription?.id || null,
      },
      access_token: this.jwtService.sign(payload, {
        expiresIn: '365d', // 1 year
      }),
      refresh_token: this.jwtService.sign(payload, {
        expiresIn: '30d', // 30 days
      }),
    };
  }
  //#endregion

  //#region Register
  async handleRegister(registerDto: CreateAuthDto) {
    const registerEmailLowerCase = registerDto.email.toLowerCase();

    // Check if email already exists
    const existingUser = await this.userService.checkDuplicateEmail(registerEmailLowerCase);

    if (existingUser) {
      throw new ConflictException('Email đã tồn tại');
    }

    // Create user
    const user = await this.userService.create({
      ...registerDto,
      email: registerEmailLowerCase,
      avatarUrl: getInitials(registerDto.fullName),
      passwordHash: registerDto.passwordHash,
      fullName: registerDto.fullName,
      auth: 'local',
    });

    const template = 'otp';
    const content = 'Mã OTP của bạn là: ';
    const body = 'Vui lòng nhập mã OTP để xác thực tài khoản của bạn.';

    // Send email
    this.mailService.generateAndSendOtp(registerEmailLowerCase, template, content, body);

    return user;
  }
  //#endregion

  //#region activeAccount
  async activeAccount(email: string, otp: string) {
    const verifyOtp = await this.mailService.verifyOtp(email, otp);
    if (!verifyOtp) {
      throw new BadRequestException('Mã OTP không hợp lệ');
    }
    const emailLower = email.toLowerCase();
    const user = await this.userService.findOneByEmail(emailLower);
    if (!user) {
      throw new NotFoundException('Email không tồn tại');
    }

    // create cart for user
    await this.cartService.createCart(user.id);
    // create wishlist for user
    await this.wishlistService.createWishlist(user.id);
    // join welcome campaign
    try {
      await this.campaignService.joinWelcomeCampaign(user.id, 'User mới đăng ký');
      this.logger.log(`User ${user.id} đã được thêm vào welcome campaign`);
    } catch (error) {
      this.logger.warn(`Không thể thêm user ${user.id} vào welcome campaign: ${error.message}`);
      // Không throw error để không ảnh hưởng đến quá trình kích hoạt tài khoản
    }
    // create point for user
    await this.pointService.findMyPoints(user.id);

    return await this.userService.activeAccount(emailLower)
  }
  //#endregion

  //#region forgotPassword
  async resetPassword(body: RestPasswordhDto) {
    const emailLower = body.email.toLowerCase();
    const user = await this.userService.findOneByEmail(emailLower);
    if (!user) {
      throw new NotFoundException('Email không tồn tại');
    }
    await this.mailService.verifyOtp(emailLower, body.otp);

    if (body.password !== body.confirmPassword) {
      throw new BadRequestException('Mật khẩu xác nhận không khớp');
    }

    if (body.password.length < 6) {
      throw new BadRequestException('Mật khẩu phải có ít nhất 6 ký tự');
    }

    return await this.userService.resetPassword(user, body.password);
  }
  //#endregion
}