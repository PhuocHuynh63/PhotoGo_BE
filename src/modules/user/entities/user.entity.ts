import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column({ nullable: true })
    avatar: string;

    @Column({ default: '' })
    password: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ default: 'user' })
    role: string;

    @Column({ default: 'active' })
    status: string;

    @Column({ nullable: true })
    authProvider: string;
}
