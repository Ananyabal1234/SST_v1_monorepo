import { Module } from '@nestjs/common';
import { CandidatesService } from './candidates.service';
import { CandidatesController } from './candidates.controller';
import { ResumeParseService } from './resume-parse.service';
import { OffersModule } from '../offers/offers.module';
import { RequirementsModule } from '../requirements/requirements.module';

@Module({
  imports: [OffersModule, RequirementsModule],
  providers: [CandidatesService, ResumeParseService],
  controllers: [CandidatesController],
  exports: [CandidatesService],
})
export class CandidatesModule {}
