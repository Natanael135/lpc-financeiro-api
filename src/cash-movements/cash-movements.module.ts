import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  CashMovement,
  CashMovementSchema,
} from './schemas/cash-movement.schema';
import { CashMovementsService } from './cash-movements.service';
import { CashMovementsController } from './cash-movements.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CashMovement.name, schema: CashMovementSchema },
    ]),
  ],
  controllers: [CashMovementsController],
  providers: [CashMovementsService],
  exports: [CashMovementsService],
})
export class CashMovementsModule {}
