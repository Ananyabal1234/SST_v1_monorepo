import { Module } from '@nestjs/common';
import { WorkService } from './work.service';
import { WorkController } from './work.controller';

@Module({
  providers: [WorkService],
  controllers: [WorkController],
})
export class WorkModule {}
