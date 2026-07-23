import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MasterDataModule } from './master-data/master-data.module';
import { RequirementsModule } from './requirements/requirements.module';
import { CandidatesModule } from './candidates/candidates.module';
import { OffersModule } from './offers/offers.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AuditModule } from './audit/audit.module';
import { ImportModule } from './import/import.module';
import { IdSequenceModule } from './id-sequence/id-sequence.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../.env'] }),
    PrismaModule,
    IdSequenceModule,
    HealthModule,
    AuthModule,
    UsersModule,
    MasterDataModule,
    RequirementsModule,
    CandidatesModule,
    OffersModule,
    OnboardingModule,
    DashboardModule,
    AuditModule,
    ImportModule,
  ],
})
export class AppModule {}
