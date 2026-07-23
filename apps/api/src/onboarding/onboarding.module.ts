import { Module, forwardRef } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';
import { RequirementsModule } from '../requirements/requirements.module';
import { OffersModule } from '../offers/offers.module';

@Module({
  imports: [
    forwardRef(() => RequirementsModule),
    forwardRef(() => OffersModule),
  ],
  providers: [OnboardingService],
  controllers: [OnboardingController],
  exports: [OnboardingService],
})
export class OnboardingModule {}
