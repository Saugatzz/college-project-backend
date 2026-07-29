import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserInteraction } from 'src/entities/user-interaction.entity';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserInteraction])],
  providers: [InteractionsService],
  exports: [InteractionsService],
})
export class InteractionsModule {}
