import { Module } from '@nestjs/common';
import { SupportTicket } from './entities/support_ticket.entity';
import { SupportTicketService } from './support_tickets.service';
import { SupportTicketController } from './support_tickets.controller';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket])],
  controllers: [SupportTicketController],
  providers: [SupportTicketService],
})
export class SupportTicketsModule {}
