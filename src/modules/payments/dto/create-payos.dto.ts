import { IsNotEmpty, IsNumber, IsString } from "class-validator";

export class CreatePayosDto {
    
    @IsNotEmpty()
    @IsNumber()
    amount: number;
    
    @IsNotEmpty()
    @IsString()
    currency: string;
    }