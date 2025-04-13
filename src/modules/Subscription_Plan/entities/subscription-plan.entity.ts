import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('subscription_plan')
export class SubscriptionPlan {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: false, unique: true })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}