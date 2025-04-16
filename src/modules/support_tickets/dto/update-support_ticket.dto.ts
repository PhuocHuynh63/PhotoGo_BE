import { PartialType } from '@nestjs/mapped-types';
import { CreateSupportTicketDto } from './create-support_ticket.dto';

export class UpdateSupportTicketDto extends PartialType(CreateSupportTicketDto) {}
