import { BadRequestException, ConflictException, ConsoleLogger, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { RoleService } from '../roles/role.service';
import { getInitials, hashPasswordHelper } from 'src/utils/utils';
import { CreateAuthDto } from '../auth/dto/create-auth.dto';
import * as bcrypt from 'bcrypt';
import { UploadService } from 'src/3rdService/upload/upload.service';
import { MailService } from 'src/3rdService/mail/mail.service';
import { FindAllUserDto } from './dto/admin/find-all-user.dto';
import { UpdateUserForAdminDto } from './dto/admin/update-user-admin.dto';
import { UserStatus } from 'src/constants/user.enum';
import { Cron } from '@nestjs/schedule';
import { BullQueueService } from 'src/3rdService/bull/bull-queue.service';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { CartService } from 'src/modules/carts/cart.service';
import { WishlistService } from 'src/modules/wishlists/wishlist.service';
import { CampaignService } from 'src/modules/campaign/campaign.service';
@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly roleService: RoleService,
    private readonly uploadService: UploadService,
    private readonly MailService: MailService,
    private readonly cartService: CartService,
    private readonly wishlistService: WishlistService,
    private readonly campaignService: CampaignService,
    private readonly bullQueueService: BullQueueService,
    @InjectQueue('user-deletion') private readonly deletionQueue: Queue,
  ) { }

  // #region create 
  async createUser(createAuthDto: CreateAuthDto): Promise<User> {
    const { passwordHash, status, avatarUrl, ...userData } = createAuthDto;

    // Kiểm tra xem email đã tồn tại chưa
    const existingUser = await this.userRepository.findOne({ where: { email: createAuthDto.email } });
    if (existingUser) {
      throw new ConflictException(`Email ${createAuthDto.email} đã được sử dụng`);
    }

    // Enforce the strong password regex for local registration
    let hashedPassword = '';
    if (createAuthDto.auth === 'local') {
      hashedPassword = await hashPasswordHelper(passwordHash);
    }

    let role = null;
    if (!createAuthDto.roleId) {
      role = await this.roleService.getDefaultRole(); // Lấy role mặc định từ RoleService
    } else {
      role = await this.roleService.findOne(createAuthDto.roleId);
    } // Tìm role theo roleId


    const newUser = this.userRepository.create({
      passwordHash: hashedPassword,
      status: status || UserStatus.ACTIVE,
      avatarUrl: getInitials(userData.fullName),
      ...userData,
      role,
    });

    const savedUser = await this.userRepository.save(newUser);

    await Promise.all([
      this.cartService.createCart(savedUser.id),
      this.wishlistService.createWishlist(savedUser.id)
    ]);

    // Join welcome campaign for new user
    await this.assignWelcomeCampaign(savedUser.id, 'Admin tạo user mới');

    return savedUser;
  }
  //#endregion create

  //#region create
  async create(createAuthDto: CreateAuthDto): Promise<User> {
    try {
      const { passwordHash, ...userData } = createAuthDto;

      // Xử lý mật khẩu
      let hashedPassword = '';
      if (createAuthDto.auth === 'local') {
        hashedPassword = await hashPasswordHelper(passwordHash);
      }

      // Xử lý vai trò
      let role = null;
      if (!createAuthDto.roleId) {
        role = await this.roleService.getDefaultRole();
      } else {
        role = await this.roleService.findOne(createAuthDto.roleId);
      }

      // Tạo người dùng với trạng thái INACTIVE
      const user = this.userRepository.create({
        passwordHash: hashedPassword,
        ...userData,
        role,
      });

      // Lưu người dùng
      const savedUser = await this.userRepository.save(user);

      // Thêm tác vụ xóa vào hàng đợi
      // const jobAdded = await this.bullQueueService.addJob(this.deletionQueue, 'delete-inactive-user', { userId: savedUser.id }, {
      //   delay: 5 * 60 * 1000,
      //   attempts: 3,
      //   backoff: { type: 'fixed', delay: 1000 },
      //   removeOnComplete: true,
      //   removeOnFail: true,
      // });

      // if (jobAdded) {
      //   this.logger.log(`Đã tạo người dùng ID ${savedUser.id} và lập lịch xóa sau 5 phút`);
      // } else {
      //   this.logger.warn(`Đã tạo người dùng ID ${savedUser.id} nhưng không thể lập lịch xóa do lỗi Redis`);
      // }

      // create cart for user
      await this.cartService.createCart(savedUser.id);

      // create wishlist for user
      await this.wishlistService.createWishlist(savedUser.id);

      // Join welcome campaign for new user (even if inactive)
      await this.assignWelcomeCampaign(savedUser.id, 'Admin tạo user mới (chưa active)');

      return savedUser;
    } catch (error) {
      this.logger.error(`Lỗi khi tạo người dùng: ${error.message}`, error.stack);
      throw error;
    }
  }
  //#endregion create

  //#region uploadImage
  async uploadImage(id: string, file: Express.Multer.File): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    const imageUrl = await this.uploadService.uploadImage(file, 'avatar', user.avatarUrl);
    user.avatarUrl = imageUrl;
    return this.userRepository.save(user);
  }
  //#endregion uploadImage

  //#region update
  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.findOne(id); // Tìm user theo ID
    if (!user) {
      throw new NotFoundException(`Không tìm thấy người dùng với ID ${id}`);
    }

    //#region có thể dùng để restPassword 
    // Nếu có trường passwordHash, kiểm tra mật khẩu cũ trước khi cập nhật
    if (updateUserDto.password && updateUserDto.oldPasswordHash && updateUserDto.confirmPassword) {
      const isMatch = await bcrypt.compare(updateUserDto.oldPasswordHash, user.passwordHash);
      if (!isMatch) {
        throw new BadRequestException('Mật khẩu cũ không đúng');
      }
      if (updateUserDto.password !== updateUserDto.confirmPassword) {
        throw new BadRequestException('Mật khẩu xác nhận không khớp');
      }
      updateUserDto.oldPasswordHash = user.passwordHash; // Lưu mật khẩu cũ để so sánh
      // Mã hóa mật khẩu mới
      user.passwordHash = await hashPasswordHelper(updateUserDto.password);
    }
    // ||=====================END========================||//
    //#endregion

    // Cập nhật thông tin user
    Object.assign(user, updateUserDto);

    // Lưu thay đổi vào cơ sở dữ liệu
    return this.userRepository.save(user);
  }
  //#endregion update

  //#region updateUserByAdmin
  async updateUserByAdmin(id: string, update: UpdateUserForAdminDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    if (update.password) {
      const passwordHash = await hashPasswordHelper(update.password);
      user.oldPasswordHash = user.passwordHash; // Lưu mật khẩu cũ để so sánh
      user.passwordHash = passwordHash; // Cập nhật mật khẩu mới
    }

    // Cập nhật thông tin từ DTO
    Object.assign(user, update);

    // Nếu có roleId, tìm role và gán vào user
    if (update.roleId) {
      const role = await this.roleService.findOne(update.roleId);
      if (!role) {
        throw new NotFoundException(`Role with ID ${update.roleId} not found`);
      }
      user.role = role;
    }

    return this.userRepository.save(user);
  }
  //#endregion updateUserByAdmin

  //#region updateStatus
  async updateStatus(id: string, status: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${id} không tồn tại`);
    }
    user.status = status;
    return this.userRepository.save(user);
  }
  //#endregion updateStatus

  //#region updateRank
  async updateRank(id: string, rank: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${id} không tồn tại`);
    }
    user.rank = rank;
    return this.userRepository.save(user);
  }
  //#endregion updateRank

  //#region update loginAt
  async updateLoginAt(user: User): Promise<User> {
    user.lastLoginAt = new Date();
    return this.userRepository.save(user);
  }
  //#endregion update loginAt

  //#region remove
  async remove(id: string): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
  //#endregion remove

  //#region activateAccount
  async activeAccount(email: string): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('Người dùng không tồn tại');
    }
    if (user.status === UserStatus.ACTIVE) {
      throw new BadRequestException('Tài khoản đã được kích hoạt');
    }
    user.status = UserStatus.ACTIVE;
    await this.userRepository.save(user);
    return { message: 'Tài khoản đã được kích hoạt' };
  }
  //#endregion

  //#region resetPassword
  async resetPassword(user: User, passwordHash: string): Promise<boolean> {
    const isMatch = await bcrypt.compare(passwordHash, user.passwordHash);
    if (isMatch) {
      throw new BadRequestException('Mật khẩu mới không được giống với mật khẩu cũ');
    }
    user.oldPasswordHash = user.passwordHash;
    user.passwordHash = await hashPasswordHelper(passwordHash);
    await this.userRepository.save(user);
    return true;
  }
  //#endregion

  //#region findAll
  async findAll(query: FindAllUserDto): Promise<{
    data: User[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    //#region Pagination
    const currentPage = query.current ? Number(query.current) : 1;
    const pageSize = query.pageSize ? Number(query.pageSize) : 10;
    const skip = (currentPage - 1) * pageSize;
    //#endregion

    //#region Filter
    const queryBuilder = this.userRepository.createQueryBuilder('user')
      .select([
        'user.id',
        'user.fullName',
        'user.email',
        'user.phoneNumber',
        'user.status',
        'user.rank',
        'user.auth',
        'user.lastLoginAt',
        'user.createdAt',
        'user.updatedAt',
        'user.avatarUrl'
      ]);

    // Thêm join để lấy thông tin role
    queryBuilder.leftJoinAndSelect('user.role', 'role');

    if (query.term) {
      queryBuilder.andWhere(
        `(unaccent(user.fullName) ILIKE unaccent(:term) OR unaccent(user.email) ILIKE unaccent(:term) OR unaccent(user.phoneNumber) ILIKE unaccent(:term))`,
        { term: `%${query.term}%` },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('user.status = :status', { status: query.status });
    }

    if (query.rank) {
      queryBuilder.andWhere('user.rank = :rank', { rank: query.rank });
    }

    if (query.role) {
      queryBuilder.andWhere('role.id = :roleId', { roleId: query.role });
    }

    if (query.auth) {
      queryBuilder.andWhere('user.auth = :auth', { auth: query.auth });
    }
    //#endregion

    //#region Sort
    const allowedSortFields = ['createdAt', 'updatedAt', 'role', 'fullName', 'email', 'phoneNumber', 'status', 'rank', 'lastLoginAt'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    // Handle role sorting separately since it requires joining
    if (sortField === 'role') {
      queryBuilder.addOrderBy('role.name', sortDirection);
    } else {
      queryBuilder.addOrderBy(`user.${sortField}`, sortDirection);
    }
    //#endregion

    //#region Pagination
    queryBuilder.skip(skip).take(pageSize);
    //#endregion

    const [data, totalItem] = await queryBuilder.getManyAndCount();
    const totalPage = Math.ceil(totalItem / pageSize);

    return {
      data,
      pagination: {
        current: currentPage,
        pageSize,
        totalPage,
        totalItem,
      },
    };
  }
  //#endregion findAll

  //#region findOne
  async findOne(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });
    if (!user) {
      throw new NotFoundException(`Người dùng với ID ${id} không tồn tại`);
    }
    return user;
  }
  //#endregion findOne

  //#region findOneByEmail
  async findOneByEmail(email: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { email }, relations: ['role'] });
    if (!user) {
      throw new NotFoundException(`Người dùng với email ${email} không tồn tại`);
    }
    return user;
  }
  //#endregion findOneByEmail

  //#region findOneByEmail
  async findOneEmail(email: string): Promise<User | undefined> {
    const user = await this.userRepository.findOne({ where: { email }, relations: ['role'] });
    return user;
  }
  //#endregion findOneByEmail

  //#region checkDuplicateEmail
  async checkDuplicateEmail(email: string): Promise<boolean> {
    const user = await this.userRepository.findOne({ where: { email }, relations: ['role'] });
    return !!user;
  }
  //#endregion checkDuplicateEmail

  //#region Count user by rank
  async countUserByRank(rank: string): Promise<number> {
    const count = await this.userRepository.count({ where: { rank } });
    return count;
  }
  //#endregion Count user by rank

  //#region Get all ranks with count
  async getAllRank(): Promise<{ rank: string; count: number }[]> {
    const rankCounts = await this.userRepository
      .createQueryBuilder('user')
      .select('user.rank', 'rank') // Chọn cột rank
      .addSelect('COUNT(user.id)', 'count') // Đếm số lượng user theo rank
      .groupBy('user.rank') // Nhóm theo rank
      .getRawMany();

    // Định dạng kết quả trả về
    return rankCounts.map((item) => ({
      rank: item.rank,
      count: Number(item.count), // Chuyển count từ string sang number
    }));
  }
  //#endregion Get all ranks with count

  //#region exportUsers
  async exportUsers(query: FindAllUserDto): Promise<User[]> {
    const queryBuilder = this.userRepository.createQueryBuilder('user');

    // Thêm join để lấy thông tin role
    queryBuilder.leftJoinAndSelect('user.role', 'role');

    // Áp dụng bộ lọc tương tự như findAll
    if (query.term) {
      queryBuilder.andWhere(
        '(user.fullName ILIKE :term OR user.email ILIKE :term OR user.phoneNumber ILIKE :term)',
        { term: `%${query.term}%` },
      );
    }

    if (query.status) {
      queryBuilder.andWhere('user.status = :status', { status: query.status });
    }

    if (query.rank) {
      queryBuilder.andWhere('user.rank = :rank', { rank: query.rank });
    }

    if (query.auth) {
      queryBuilder.andWhere('user.auth = :auth', { auth: query.auth });
    }

    // Sắp xếp
    const allowedSortFields = ['createdAt', 'updatedAt', 'fullName', 'email', 'phoneNumber', 'status', 'rank', 'role', 'lastLoginAt'];
    const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
    const sortDirection = query.sortDirection === 'desc' ? 'DESC' : 'ASC';

    // Handle role sorting separately since it requires joining
    if (sortField === 'role') {
      queryBuilder.addOrderBy('role.name', sortDirection);
    } else {
      queryBuilder.addOrderBy(`user.${sortField}`, sortDirection);
    }

    // Lấy tất cả dữ liệu (không phân trang)
    const users = await queryBuilder.getMany();
    return users;
  }
  //#endregion exportUsers

  //#region auto send mail
  /**
   * Cron job để kiểm tra thời gian đăng nhập cuối cùng của tất cả người dùng
   * và gửi email thông báo nếu thời gian lớn hơn 5 phút.
  */
  // @Cron('0 */5 * * * *') // Chạy mỗi 5 phút
  // async checkLastLoginForAllUsers(): Promise<void> {
  //   const now = new Date();

  //   // Lấy danh sách người dùng cần gửi email
  //   const users = await this.userRepository
  //     .createQueryBuilder('user')
  //     .select(['user.id', 'user.email', 'user.fullName', 'user.lastLoginAt'])
  //     .where('user.lastLoginAt IS NOT NULL') // Chỉ lấy người dùng có lastLoginAt
  //     .getMany();

  //   for (const user of users) {
  //     const durationMs = now.getTime() - user.lastLoginAt.getTime();

  //     // Kiểm tra các mốc thời gian và gửi email nếu cần
  //     if (this.shouldSendEmail(user, durationMs)) {
  //       await this.sendLastLoginEmail(user, durationMs);
  //     }
  //   }
  // }

  // Hàm kiểm tra xem có nên gửi email hay không
  private shouldSendEmail(user: User, durationMs: number): boolean {
    // Các mốc thời gian tính bằng mili-giây
    const fiveMinutes = 5 * 60 * 1000;
    const tenMinutes = 10 * 60 * 1000;
    const fifteenMinutes = 15 * 60 * 1000;

    // Kiểm tra các mốc thời gian dựa trên durationMs
    if (durationMs > fiveMinutes && durationMs <= tenMinutes) {
      return true; // Gửi email cho mốc 5 phút
    } else if (durationMs > tenMinutes && durationMs <= fifteenMinutes) {
      return true; // Gửi email cho mốc 10 phút
    } else if (durationMs > fifteenMinutes && durationMs <= fifteenMinutes + 5 * 60 * 1000) {
      return true; // Gửi email cho mốc 15 phút (chỉ trong khoảng gần 15 phút)
    }

    return false; // Không gửi email nếu không nằm trong các mốc thời gian
  }

  // Hàm gửi email
  private async sendLastLoginEmail(user: User, durationMs: number): Promise<void> {
    // Tính toán thời gian đã trôi qua
    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const durationHours = Math.floor((durationMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    const duration = `${durationDays} ngày, ${durationHours} giờ, ${durationMinutes} phút trước`;

    // Gửi email thông báo
    const emailSubject = 'Thông báo về lần đăng nhập cuối cùng của bạn';
    const emailTemplate = 'last-login';
    const emailContext = {
      fullName: user.fullName,
      lastLoginAt: user.lastLoginAt.toLocaleString('vi-VN'),
      duration,
    };

    await this.MailService.sendMail(user.email, emailSubject, emailTemplate, emailContext);
  }
  //#endregion checkLastLoginForAllUsers

  //#region processDeletionQueue
  /**
   * Xử lý tác vụ xóa người dùng chưa kích hoạt
   * @param job Tác vụ từ hàng đợi
   */
  // Xử lý tác vụ xóa từ hàng đợi
  async processDeletionQueue(job: { data: { userId: string } }): Promise<void> {
    try {
      const { userId } = job.data;
      const result = await this.userRepository.delete({
        id: userId,
        status: UserStatus.INACTIVE,
      });

      if (result.affected) {
        this.logger.log(`Đã xóa người dùng chưa kích hoạt ID ${userId}`);
      } else {
        this.logger.warn(`Không tìm thấy người dùng ID ${userId} hoặc đã kích hoạt`);
      }
    } catch (error) {
      this.logger.error(`Lỗi khi xóa người dùng ID ${job.data.userId}: ${error.message}`, error.stack);
    }
  }
  //#endregion processDeletionQueue

  //#region assignWelcomeCampaign
  /**
   * Assign user to welcome campaign
   * @param userId User ID
   * @param note Note for the assignment
   */
  private async assignWelcomeCampaign(userId: string, note?: string): Promise<void> {
    try {
      await this.campaignService.joinWelcomeCampaign(userId, note);
      this.logger.log(`User ${userId} đã được thêm vào welcome campaign`);
    } catch (error) {
      this.logger.warn(`Không thể thêm user ${userId} vào welcome campaign: ${error.message}`);
      // Không throw error để không ảnh hưởng đến quá trình tạo user
    }
  }
  //#endregion assignWelcomeCampaign

}