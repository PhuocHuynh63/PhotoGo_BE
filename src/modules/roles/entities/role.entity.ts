import { User } from 'src/modules/users/entities/user.entity';
import { Entity, Column, PrimaryColumn, OneToMany } from 'typeorm';

@Entity('roles') // Tên bảng là "roles"
export class Role {
  @PrimaryColumn({ type: 'varchar', length: 10 }) // Khóa chính, kiểu VARCHAR(10)
  id: string;

  @Column({ unique: true, length: 50 }) // Cột name, kiểu VARCHAR(50), UNIQUE
  name: string;

  @Column({ type: 'text', nullable: true }) // Cột description, kiểu TEXT, có thể null
  description?: string;

  @OneToMany(() => User, (user) => user.role) // Quan hệ 1-n với bảng User
  users: User[];
}