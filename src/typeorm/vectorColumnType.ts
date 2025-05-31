import { ColumnType, DataSource } from 'typeorm';

export const VectorColumnType = {
    type: 'vector',
    databaseType: 'vector', // The PostgreSQL type
    typescriptType: Array<number>, // The TypeScript type (number[])
    defaultOptions: {
        nullable: true,
    },
    toDatabase(value: number[] | null): string | null {
        if (!value) return null;
        return `[${value.join(',')}]`; // Convert to vector literal
    },
    fromDatabase(value: string | null): number[] | null {
        if (!value) return null;
        try {
            return value
                .replace(/^\[|\]$/g, '')
                .split(',')
                .map(num => parseFloat(num.trim()))
                .filter(num => !isNaN(num));
        } catch (error) {
            console.error('Error parsing vector:', error);
            return new Array(384).fill(0); // Fallback
        }
    }
};

// Register the custom column type with TypeORM
export function registerVectorColumnType(dataSource: DataSource) {
    // Cast driver to any to avoid TypeScript errors since the properties exist at runtime
    const driver = dataSource.driver as any;
    driver.supportedDataTypes.push('vector');
    driver.columnTypes = driver.columnTypes || {};
    driver.columnTypes['vector'] = VectorColumnType;
}