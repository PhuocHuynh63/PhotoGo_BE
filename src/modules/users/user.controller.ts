import { Controller, Get, Post, Put, Delete, Param, Body, UploadedFile, UseInterceptors, Query, Res, Patch } from '@nestjs/common';
import { UserService } from './user.service';

import { UpdateUserDto, UpdateUserStatusDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { Public, ResponseMessage } from 'src/decorator/custom';
import { ApiBearerAuth, ApiConsumes, ApiProperty } from '@nestjs/swagger';
import { UpdateUserForAdminDto } from './dto/admin/update-user-admin.dto';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FindAllUserDto } from './dto/admin/find-all-user.dto';
import { CreateAuthDto, CreateAuthForAdminDto } from '../auth/dto/create-auth.dto';
import { RolesGuard } from '../auth/passport/roles.guard';
import { UseGuards } from '@nestjs/common';
import { Roles } from 'src/decorator/role.decorator';
import { UserStatus, UserRolesId, UserRoles } from 'src/constants/user.enum';
import { Role } from '../roles/entities/role.entity';
import { BadRequestException } from '@nestjs/common';
import { IsEnum } from 'class-validator';


@Controller('users')
@UseGuards(RolesGuard)
@ApiBearerAuth('access-token')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('/create/user')
  @Roles({ id: UserRolesId.ADMIN, name: UserRoles.ADMIN } as Role)
  @ApiOperation({ summary: 'Tạo người dùng (Admin)' })
  @ApiConsumes('multipart/form-data')
  @ResponseMessage('Tạo người dùng thành công')
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'avatarUrl', maxCount: 1 },
  ]))
  async createUserForAdmin(@Body() createUser: CreateAuthForAdminDto): Promise<User> {
    return this.userService.createUserForAdmin(createUser);
  }

  @Public()
  @Get('export')
  @ApiOperation({ summary: 'Xuất danh sách người dùng sang file Excel (Public)' })
  @ApiResponse({
    status: 200,
    description: 'Xuất danh sách người dùng sang file Excel',
  })
  async exportUsers(@Query() query: FindAllUserDto, @Res() res: Response) {
    // Lấy danh sách người dùng từ service
    const users = await this.userService.exportUsers(query);

    // Tạo workbook và worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Định nghĩa các cột trong worksheet
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 36 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Họ và Tên', key: 'full_name', width: 20 },
      { header: 'Số Điện Thoại', key: 'phone_number', width: 15 },
      { header: 'Vai Trò', key: 'role', width: 15 },
      { header: 'Trạng Thái', key: 'status', width: 15 },
      { header: 'Hạng', key: 'rank', width: 15 },
      { header: 'Phương Thức Xác Thực', key: 'auth', width: 20 },
      { header: 'Ngày Tạo', key: 'created_at', width: 25 },
      { header: 'Ngày Cập Nhật', key: 'updated_at', width: 25 },
    ];

    // Định dạng header: in đậm, font Times New Roman, căn giữa
    worksheet.getRow(1).font = { name: 'Times New Roman', bold: true };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // Thêm dữ liệu vào worksheet
    users.forEach((user) => {
      worksheet.addRow({
        id: user.id,
        email: user.email,
        full_name: user.fullName,
        phone_number: user.phoneNumber,
        role: user.role ? user.role.name : '',
        status: user.status,
        rank: user.rank,
        auth: user.auth,
        created_at: user.createdAt.toLocaleString('vi-VN'), // Định dạng ngày giờ theo kiểu Việt Nam
        updated_at: user.updatedAt.toLocaleString('vi-VN'),
      });
    });

    // Định dạng font cho toàn bộ dữ liệu: Times New Roman
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) { // Bỏ qua hàng header
        row.font = { name: 'Times New Roman' };
        row.alignment = { vertical: 'middle' }; // Căn giữa theo chiều dọc
      }
    });

    // Tự động điều chỉnh độ rộng cột dựa trên nội dung (nếu cần rộng hơn giá trị mặc định)
    worksheet.columns.forEach((column) => {
      let maxLength = column.header.length;
      worksheet.eachRow({ includeEmpty: true }, (row) => {
        const cellValue = row.getCell(column.key).value?.toString() || '';
        maxLength = Math.max(maxLength, cellValue.length);
      });
      column.width = Math.max(column.width || 10, maxLength + 2); // Đảm bảo cột đủ rộng
    });

    // Thiết lập header để gửi file Excel về client
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', 'attachment; filename="users_export.xlsx"');

    // Ghi workbook vào buffer và gửi về client
    const buffer = await workbook.xlsx.writeBuffer();
    res.send(buffer);
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Lấy danh sách người dùng (Public)' })
  @ResponseMessage('Lấy danh sách người dùng thành công')
  async findAll(@Query() query: FindAllUserDto): Promise<{
    data: User[];
    pagination: {
      current: number;
      pageSize: number;
      totalPage: number;
      totalItem: number;
    };
  }> {
    return this.userService.findAll(query);
  }

  @Public()
  @Get('statistics/:userId')
  @ApiOperation({ summary: 'Thống kê tổng quan cho user (tổng booking, tổng tiền, tổng subscription, điểm, voucher...)' })
  async getUserStatistics(@Param('userId') userId: string) {
    return this.userService.getUserStatistics(userId);
  }

  @Public()
  @Get('/email/:email')
  @ApiOperation({ summary: 'Lấy thông tin người dùng theo email (Public)' })
  @ResponseMessage('Lấy thông tin người dùng theo email thành công')
  async findOneByEmail(@Param('email') email: string): Promise<User> {
    return this.userService.findOneByEmail(email);
  }

  @Get('/admin/count/:rank')
  @ApiOperation({ summary: 'Đếm người dùng theo rank (Admin)' })
  @Roles({ id: UserRolesId.ADMIN, name: UserRoles.ADMIN } as Role)
  @ResponseMessage('Đếm người dùng theo rank thành công')
  async countUserByRank(@Param('rank') rank: string): Promise<number> {
    return this.userService.countUserByRank(rank);
  }


  @Get('/admin/ranks')
  @ApiOperation({ summary: 'Lấy danh sách rank người dùng (Admin)' })
  @Roles({ id: UserRolesId.ADMIN, name: UserRoles.ADMIN } as Role)
  @ResponseMessage('Lấy danh sách rank người dùng thành công')
  async getAllRanks(): Promise<{ rank: string; count: number }[]> {
    return this.userService.getAllRank();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Lấy thông tin người dùng theo ID (Public)' })
  @ResponseMessage('Lấy thông tin người dùng thành công')
  async findOne(@Param('id') id: string): Promise<User> {
    return this.userService.findOne(id);
  }  

  @Put('/img/:id/')
  @ApiOperation({ summary: 'Cập nhật ảnh người dùng' })
  @UseInterceptors(FileInterceptor('file'))
  @ResponseMessage('Cập nhật ảnh người dùng thành công')
  async updateImage(@Param('id') id: string, @UploadedFile() file: Express.Multer.File): Promise<User> {
    return this.userService.uploadImage(id, file);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng' })
  @ResponseMessage('Chỉnh sửa người dùng thành công')
  async update(@Param('id') id: string, @Body() update: UpdateUserDto): Promise<User> {
    return this.userService.update(id, update);
  }

  @Put('/admin/:id')
  @ApiOperation({ summary: 'Cập nhật thông tin người dùng (Admin)' })
  @ResponseMessage('Chỉnh sửa người dùng thành công')
  async updateUserByAdmin(@Param('id') id: string, @Body() update: UpdateUserForAdminDto): Promise<User> {
    return this.userService.updateUserByAdmin(id, update);
  }

  @Delete(':id')
  @Roles({ id: UserRolesId.ADMIN, name: UserRoles.ADMIN } as Role)
  @ApiOperation({ summary: 'Xóa người dùng theo ID' })
  @ApiResponse({ status: 200, description: 'Xóa người dùng thành công' })
  @ResponseMessage('Xóa người dùng thành công')
  async remove(@Param('id') id: string): Promise<void> {
    return this.userService.remove(id);
  }

  @Patch(':id/status')
  @Roles({ id: UserRolesId.ADMIN, name: UserRoles.ADMIN } as Role)
  @ApiOperation({ summary: 'Cập nhật trạng thái tài khoản user' })
  @ApiResponse({ status: 200, description: 'Cập nhật trạng thái tài khoản user thành công' })
  @ApiResponse({ status: 400, description: 'Trạng thái không hợp lệ' })
  async updateUserStatus(@Param('id') id: string, @Body() body: UpdateUserStatusDto) {
    return this.userService.updateStatus(id, body.status);
  }



}

