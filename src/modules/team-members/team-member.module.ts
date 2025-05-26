import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TeamMember } from './entities/team-member.entity';
import { TeamMemberService } from './team-member.service';
import { TeamMemberController } from '../team-members/team-member.controller';
import { Location } from '../locations/entities/location.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TeamMember, Location])],
  providers: [TeamMemberService],
  controllers: [TeamMemberController],
  exports: [TeamMemberService],
})
export class TeamMemberModule {}