import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { Model } from 'mongoose';
import { Device, DeviceDocument } from '../devices/schemas/device.schema';
import {
  Employee,
  EmployeeDocument,
} from '../employees/schemas/employee.schema';
import {
  ScheduleEntry,
  ScheduleEntryDocument,
} from '../schedule/schemas/schedule-entry.schema';
import {
  CalendarEvent,
  CalendarEventDocument,
} from '../calendar-events/schemas/calendar-event.schema';
import {
  EventCompletion,
  EventCompletionDocument,
} from '../calendar-events/schemas/event-completion.schema';
import { UNITS } from '../common/unit';

dayjs.extend(utc);

export type NotificationSlot = '08' | '12' | '15';

interface PushMessage {
  title: string;
  body: string;
}

const UNIT_LABELS: Record<string, string> = {
  shopping: 'Shopping',
  centro: 'Centro',
};

// Fortaleza é UTC-3 fixo (sem horário de verão).
function nowInFortaleza() {
  return dayjs.utc().subtract(3, 'hour');
}

function eventOccursOn(event: CalendarEvent, date: dayjs.Dayjs): boolean {
  const d = date.format('YYYY-MM-DD');
  if (event.recurrence === 'once') return event.date === d;
  if (event.recurrence === 'weekly') {
    return (event.daysOfWeek ?? []).includes(date.day());
  }
  return event.dayOfMonth === date.date();
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Device.name) private deviceModel: Model<DeviceDocument>,
    @InjectModel(Employee.name) private employeeModel: Model<EmployeeDocument>,
    @InjectModel(ScheduleEntry.name)
    private entryModel: Model<ScheduleEntryDocument>,
    @InjectModel(CalendarEvent.name)
    private eventModel: Model<CalendarEventDocument>,
    @InjectModel(EventCompletion.name)
    private completionModel: Model<EventCompletionDocument>,
  ) {}

  // Slots fixos combinados: avisos às 8h, reavisos às 12h e 15h (Fortaleza).
  @Cron('0 8 * * *', { timeZone: 'America/Fortaleza' })
  cron08() {
    return this.runSlot('08');
  }

  @Cron('0 12 * * *', { timeZone: 'America/Fortaleza' })
  cron12() {
    return this.runSlot('12');
  }

  @Cron('0 15 * * *', { timeZone: 'America/Fortaleza' })
  cron15() {
    return this.runSlot('15');
  }

  async runSlot(slot: NotificationSlot) {
    const today = nowInFortaleza();
    const messages: PushMessage[] = [];

    for (const unit of UNITS) {
      if (slot === '08') {
        messages.push(...(await this.folgaMessages(unit, today, 'hoje')));
        messages.push(
          ...(await this.reminderMessages(unit, today, 'Lembrete de hoje')),
        );
      } else {
        messages.push(
          ...(await this.reminderMessages(unit, today, 'Lembrete pendente')),
        );
        if (slot === '15') {
          messages.push(
            ...(await this.folgaMessages(unit, today.add(1, 'day'), 'amanhã')),
          );
        }
      }
    }

    const result = await this.sendPush(messages);
    this.logger.log(
      `slot ${slot}: ${messages.length} mensagem(ns), ${result.devices} aparelho(s)`,
    );
    return { slot, messages: messages.length, ...result };
  }

  /** Notificação de teste para validar o registro do aparelho. */
  async sendTest() {
    return this.sendPush([
      {
        title: 'Teste de notificação',
        body: 'As notificações da escala estão funcionando! 🎉',
      },
    ]);
  }

  /** Folgas (normais e compensatórias) de um dia. */
  private async folgaMessages(
    unit: string,
    date: dayjs.Dayjs,
    when: 'hoje' | 'amanhã',
  ): Promise<PushMessage[]> {
    const d = date.format('YYYY-MM-DD');
    const entries = await this.entryModel.find({
      unit,
      date: d,
      status: { $in: ['dayoff', 'compday'] },
    });
    if (entries.length === 0) return [];

    const employees = await this.employeeModel.find({
      _id: { $in: entries.map((e) => e.employeeId) },
      active: true,
    });
    const nameById = new Map(employees.map((e) => [String(e._id), e.name]));

    return entries
      .filter((e) => nameById.has(String(e.employeeId)))
      .map((e) => ({
        title: when === 'hoje' ? 'Folga hoje' : 'Folga amanhã',
        body: `${nameById.get(String(e.employeeId))} folga ${when}${
          e.status === 'compday' ? ' (compensatória)' : ''
        } — ${UNIT_LABELS[unit] ?? unit}`,
      }));
  }

  /** Lembretes do dia ainda não marcados como feitos. */
  private async reminderMessages(
    unit: string,
    date: dayjs.Dayjs,
    title: string,
  ): Promise<PushMessage[]> {
    const d = date.format('YYYY-MM-DD');
    const events = await this.eventModel.find({ unit, active: true });
    const todays = events.filter((e) => eventOccursOn(e, date));
    if (todays.length === 0) return [];

    const completions = await this.completionModel.find({
      eventId: { $in: todays.map((e) => e._id) },
      date: d,
    });
    const doneIds = new Set(completions.map((c) => String(c.eventId)));

    return todays
      .filter((e) => !doneIds.has(String(e._id)))
      .map((e) => ({
        title,
        body: `Hoje é dia de: ${e.title} — ${UNIT_LABELS[unit] ?? unit}`,
      }));
  }

  /** Envia via Expo Push API para todos os aparelhos registrados. */
  private async sendPush(messages: PushMessage[]) {
    if (messages.length === 0) return { devices: 0, sent: 0 };
    const devices = await this.deviceModel.find();
    if (devices.length === 0) return { devices: 0, sent: 0 };

    const payload = messages.flatMap((m) =>
      devices.map((d) => ({
        to: d.token,
        title: m.title,
        body: m.body,
        sound: 'default',
        priority: 'high',
      })),
    );

    let sent = 0;
    // Expo aceita até 100 notificações por chamada.
    for (let i = 0; i < payload.length; i += 100) {
      const chunk = payload.slice(i, i + 100);
      try {
        const res = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        });
        const body = (await res.json()) as {
          data?: Array<{ status: string; details?: { error?: string } }>;
        };
        // Remove tokens de aparelhos que desinstalaram o app.
        body.data?.forEach((ticket, idx) => {
          if (ticket.details?.error === 'DeviceNotRegistered') {
            void this.deviceModel.deleteOne({ token: chunk[idx].to });
          } else if (ticket.status === 'ok') {
            sent += 1;
          }
        });
      } catch (e) {
        this.logger.error(`Falha ao enviar push: ${String(e)}`);
      }
    }
    return { devices: devices.length, sent };
  }
}
