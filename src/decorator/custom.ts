import { SetMetadata } from '@nestjs/common';
import { Transform } from 'class-transformer';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const RESPONSE_MESSAGE = 'response_message';
export const ResponseMessage = (message: string) =>
    SetMetadata(RESPONSE_MESSAGE, message);

// Uppercase Enum first letter
export const UppercaseEnum = <T extends { [key: string]: string }>(enumType: T) => {
    return Transform(({ value }) => {
        if (!value) return value;
        
        const enumValue = enumType[value];
        if (!enumValue) {
            throw new Error(`Invalid enum value: ${value}`);
        }
        
        return enumValue.charAt(0).toUpperCase() + enumValue.slice(1);
    });
};

