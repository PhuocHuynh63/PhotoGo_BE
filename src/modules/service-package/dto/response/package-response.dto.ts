import { ApiProperty } from '@nestjs/swagger';



export class ServicePackageDto{
    
    @ApiProperty({ example: 'Gói dịch vụ cơ bản' })
    name: string;
    
    @ApiProperty({ example: 'Mô tả gói dịch vụ cơ bản' })
    description: string;
    
    @ApiProperty({ example: 100 })
    price: number;
    
    @ApiProperty({ example: 60 })
    duration: number; // Duration in minutes

}