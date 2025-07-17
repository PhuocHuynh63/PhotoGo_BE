import * as bcrypt from 'bcryptjs';

export async function hashPasswordHelper(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
}

export async function comparePasswordHelper(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
}

export function getSortOptions(sortBy: string, sortDirection: 'asc' | 'desc', allowedSortFields: string[]): Record<string, number> {
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = sortDirection === 'desc' ? -1 : 1;
    return { [sortField]: sortOrder };
}

export function slugify(text: string): string {
    return text
        .toString()
        .normalize('NFD')                        // Chuyển đổi Unicode sang dạng chuẩn phân tách (NFD)
        .replace(/[\u0300-\u036f]/g, '')           // Xóa bỏ các dấu thanh (accent marks)
        .toLowerCase()
        .trim()
        .replace(/[\s\W-]+/g, '-')                // Thay thế khoảng trắng và ký tự đặc biệt bằng dấu gạch ngang
        .replace(/^-+|-+$/g, '');                 // Loại bỏ dấu gạch ngang ở đầu và cuối chuỗi
}


export function getInitials(fullName: string): string {
    if (!fullName) return '';
    const words = fullName.trim().split(' ');
    if (words.length === 1) return words[0][0]?.toUpperCase() || '';
    if (words.length === 2) return (words[0][0] + words[1][0]).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase(); // VD: Nguyễn Văn A → NA
}

export function maskPhoneNumber(phoneNumber: string): string {
    if (!phoneNumber || phoneNumber.length < 4) return phoneNumber;
    const lastFourDigits = phoneNumber.slice(-4);
    return '#'.repeat(phoneNumber.length - 4) + lastFourDigits;
}

export function maskEmail(email: string): string {
    if (!email || !email.includes('@')) return email;
    const [localPart, domain] = email.split('@');
    const maskedLocalPart = localPart.length > 2 ? localPart[0] + '#'.repeat(localPart.length - 2) + localPart.slice(-1) : localPart;
    return `${maskedLocalPart}@${domain}`;
}