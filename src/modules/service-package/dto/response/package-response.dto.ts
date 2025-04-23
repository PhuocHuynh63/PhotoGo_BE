import { ApiProperty } from '@nestjs/swagger';



export class ServicePackageDto{
    
    @ApiProperty({ example: 'Basic Package' })
    name: string;
    
    @ApiProperty({ example: 'This is a basic service package.' })
    description: string;
    
    @ApiProperty({ example: 100 })
    price: number;
    
    @ApiProperty({ example: 60 })
    duration: number; // Duration in minutes

}