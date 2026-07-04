import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Revenue, RevenueSchema } from './schemas/revenue.schema';
import { RevenueService } from './revenue.service';
import { RevenueController } from './revenue.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Revenue.name, schema: RevenueSchema }]),
  ],
  controllers: [RevenueController],
  providers: [RevenueService],
  exports: [RevenueService],
})
export class RevenueModule {}
