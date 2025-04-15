import { Role } from 'src/modules/roles/entities/role.entity';
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users') // Tên bảng là "users"
export class User {
  @PrimaryGeneratedColumn('uuid') // UUID tự động tạo
  id: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ name: 'password_hash', length: 255 })
  passwordHash: string;

  @Column({ name: 'old_password_hash', length: 255, nullable: true })
  oldPasswordHash?: string;

  @Column({ name: 'full_name', length: 100 })
  fullName: string;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber?: string;

  @Column({ name: 'avatar_url', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ default: 'active' })
  status: string;

  @Column({ default: 'Unrank' })
  rank: string;

  @Column()
  note: string;

  @Column({ default: 'local' })
  auth: string;

  @UpdateDateColumn({ name: 'last_login_at', type: 'timestamptz' })
  lastLoginAt: Date;

  @UpdateDateColumn({ name: 'send_mail_voucher_at', type: 'timestamptz' })
  sendMailVoucherAt: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;

  @ManyToOne(() => Role, (role) => role.users, { nullable: false }) // Quan hệ n-1 với bảng Role
  @JoinColumn({ name: 'role_id' }) // Khóa ngoại "role_id"
  role: Role;
}