import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  CalendarEvent,
  CalendarEventDocument,
  Recurrence,
} from './schemas/calendar-event.schema';
import {
  EventCompletion,
  EventCompletionDocument,
} from './schemas/event-completion.schema';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { SetCompletionDto } from './dto/set-completion.dto';

@Injectable()
export class CalendarEventsService {
  constructor(
    @InjectModel(CalendarEvent.name)
    private eventModel: Model<CalendarEventDocument>,
    @InjectModel(EventCompletion.name)
    private completionModel: Model<EventCompletionDocument>,
  ) {}

  list(unit: string) {
    return this.eventModel.find({ unit, active: true }).sort({ title: 1 });
  }

  create(dto: CreateCalendarEventDto, unit: string) {
    this.assertRecurrenceFields(dto.recurrence, dto);
    return this.eventModel.create({ ...dto, unit, active: true });
  }

  async update(id: string, dto: UpdateCalendarEventDto, unit: string) {
    const current = await this.eventModel.findOne({ _id: id, unit });
    if (!current) throw new NotFoundException('Lembrete não encontrado.');

    const recurrence = dto.recurrence ?? current.recurrence;
    this.assertRecurrenceFields(recurrence, {
      date: dto.date ?? current.date,
      daysOfWeek: dto.daysOfWeek ?? current.daysOfWeek,
      dayOfMonth: dto.dayOfMonth ?? current.dayOfMonth,
    });

    const updated = await this.eventModel.findOneAndUpdate(
      { _id: id, unit },
      { $set: dto },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Lembrete não encontrado.');
    return updated;
  }

  /** Soft delete: preserva o histórico de conclusões. */
  async remove(id: string, unit: string) {
    const updated = await this.eventModel.findOneAndUpdate(
      { _id: id, unit },
      { $set: { active: false } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Lembrete não encontrado.');
    return { sucesso: true };
  }

  listCompletions(unit: string, start: string, end: string) {
    return this.completionModel.find({
      unit,
      date: { $gte: start, $lte: end },
    });
  }

  /** Marca/desmarca a ocorrência do dia como feita (idempotente). */
  async setCompletion(eventId: string, dto: SetCompletionDto, unit: string) {
    const event = await this.eventModel.findOne({ _id: eventId, unit });
    if (!event) throw new NotFoundException('Lembrete não encontrado.');

    const filter = {
      eventId: new Types.ObjectId(eventId),
      date: dto.date,
    };
    if (dto.done) {
      await this.completionModel.updateOne(
        filter,
        { $setOnInsert: { ...filter, unit } },
        { upsert: true },
      );
    } else {
      await this.completionModel.deleteOne(filter);
    }
    return { sucesso: true, done: dto.done };
  }

  private assertRecurrenceFields(
    recurrence: Recurrence,
    fields: Pick<CreateCalendarEventDto, 'date' | 'daysOfWeek' | 'dayOfMonth'>,
  ) {
    if (recurrence === 'once' && !fields.date) {
      throw new BadRequestException('Lembrete único precisa de date.');
    }
    if (recurrence === 'weekly' && !fields.daysOfWeek?.length) {
      throw new BadRequestException(
        'Lembrete semanal precisa de daysOfWeek.',
      );
    }
    if (recurrence === 'monthly' && !fields.dayOfMonth) {
      throw new BadRequestException('Lembrete mensal precisa de dayOfMonth.');
    }
  }
}
