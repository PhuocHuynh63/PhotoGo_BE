import { ApiProperty, ApiQuery } from "@nestjs/swagger";
import { IsEnum, IsOptional, IsString } from "class-validator";
import { UserRank, UserStatus } from "src/constants/user.enum";
import { SortableFields, SortAuth, SortDirection } from "src/constants/sort-file.dto";

@ApiQuery({ required: false })
export class FindAllUserDto {
  @IsOptional()
  @IsString()
  @ApiProperty({
    example: '',
    description: 'Tên đầy đủ, số điện thoại hoặc email của người dùng',
    required: false,
  })
  term?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    enum: UserStatus,
    description: 'Trạng thái của người dùng',
    example: UserStatus.ACTIVE,
    required: false,
  })
  status?: string = '';


  @IsOptional()
  @IsString()
  @ApiProperty({
    enum: UserRank,
    description: 'Hạng của người dùng',
    example: UserRank.BRONZE,
    required: false,
  })
  rank?: string = '';

  @IsOptional()
  @IsString()
  @ApiProperty({
    enum: SortAuth,
    description: 'Mặc định là local FE không cần chuyền',
    example: SortAuth.LOCAL,
    required: false,
  })
  auth?: string = '';

  @IsOptional()
  @ApiProperty({
    example: '1',
    description: 'Số trang hiện tại',
    required: false,
  })
  current?: string = '1';

  @IsOptional()
  @ApiProperty({
    example: '10',
    description: 'Số lượng item trên mỗi trang',
    required: false,
  })
  pageSize?: string = '10';

  @IsOptional()
  @ApiProperty({
    enum: SortableFields,
    example: SortableFields.CREATED_AT,
    description: 'Trường để sắp xếp (ví dụ: createdAt, updatedAt, fullName, email, phoneNumber, status, rank, lastLoginAt, role)',
    required: false,
  })
  sortBy?: SortableFields = SortableFields.CREATED_AT;

  @IsOptional()
  @ApiProperty({
    enum: SortDirection,
    example: SortDirection.ASC,
    description: 'Hướng sắp xếp (tăng dần hoặc giảm dần)',
    required: false,
  })
  sortDirection?: SortDirection = SortDirection.ASC;
}