import { IsUUID, IsNotEmpty } from 'class-validator';

export class CheckoutSessionDto {

    @IsUUID()
    @IsNotEmpty()
    conceptId: string;

    @IsNotEmpty()
    date: string;

    @IsNotEmpty()
    time: string;

    @IsUUID()
    checkoutSessionId: string;
}