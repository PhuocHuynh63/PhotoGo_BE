import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { UserService } from '../user.service';


@Processor('user-deletion')
export class UserProcessor {
    constructor(private readonly userService: UserService) { }

    @Process('delete-inactive-user')
    async handleDeletion(job: Job<{ userId: string }>): Promise<void> {
        await this.userService.processDeletionQueue(job);
    }
}