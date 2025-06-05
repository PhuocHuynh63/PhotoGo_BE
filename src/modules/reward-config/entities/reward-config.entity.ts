import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('reward_config')
export class RewardConfig {
  @PrimaryGeneratedColumn({ name: 'config_id' })
  configId: number;

  @Column({ name: 'streak_day', unique: true })
  streakDay: number;

  @Column()
  points: number;

  @Column({ nullable: true })
  description: string;
} 