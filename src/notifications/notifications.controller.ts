import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Post,
  Query,
} from '@nestjs/common';
import {
  NotificationSlot,
  NotificationsService,
} from './notifications.service';

/**
 * Disparo manual (teste/backup dos crons). Protegido pelo NOTIFY_SECRET
 * do ambiente, já que a API não tem autenticação.
 */
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('run')
  run(@Query('slot') slot?: string, @Query('key') key?: string) {
    this.assertKey(key);
    if (!['08', '12', '15'].includes(slot ?? '')) {
      throw new BadRequestException('slot deve ser 08, 12 ou 15.');
    }
    return this.notificationsService.runSlot(slot as NotificationSlot);
  }

  @Post('test')
  test(@Query('key') key?: string) {
    this.assertKey(key);
    return this.notificationsService.sendTest();
  }

  private assertKey(key?: string) {
    const secret = process.env.NOTIFY_SECRET;
    if (!secret || key !== secret) {
      throw new ForbiddenException('Chave inválida.');
    }
  }
}
