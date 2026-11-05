import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { SiteController } from './site.controller';

@Module({
  controllers: [HealthController, SiteController],
})
export class HealthModule {}
