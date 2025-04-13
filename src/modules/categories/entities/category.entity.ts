import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('category')
export class Category {
  @PrimaryColumn({ type: 'varchar', length: 10 })
  id: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;
}