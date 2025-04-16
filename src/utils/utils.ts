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


