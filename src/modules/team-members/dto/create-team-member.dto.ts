import { IsString, IsNotEmpty, Length } from 'class-validator';

export class CreateTeamMemberDto {
  @IsString()
  @IsNotEmpty()
  vendor_id: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  full_name: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 50)
  role: string;

  @IsString()
  @Length(1, 20)
  @IsNotEmpty()
  phone_number?: string;
}