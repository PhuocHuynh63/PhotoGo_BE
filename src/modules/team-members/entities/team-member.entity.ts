import { Column, Entity, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToOne, JoinColumn } from 'typeorm';
import { Location } from 'src/modules/locations/entities/location.entity';
@Entity('team_members')
export class TeamMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Location, { nullable: false })
  @JoinColumn({ name: 'location_id' })
  location: Location;

  @Column({ type: 'varchar', length: 100, nullable: false })
  full_name: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  role: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone_number: string;

  @CreateDateColumn({ type: 'timestamptz', default: () => 'NOW()' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamptz', default: () => 'NOW()', onUpdate: 'NOW()' })
  updated_at: Date;
}