import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import dayjs from 'dayjs';
import { CalendarEventsService } from './calendar-events.service';
import { CreateCalendarEventDto } from './dto/create-calendar-event.dto';
import { UpdateCalendarEventDto } from './dto/update-calendar-event.dto';
import { SetCompletionDto } from './dto/set-completion.dto';
import { normalizeUnit } from '../common/unit';

@Controller('calendar-events')
export class CalendarEventsController {
  constructor(private readonly eventsService: CalendarEventsService) {}

  @Get()
  list(@Query('unit') unit?: string) {
    return this.eventsService.list(normalizeUnit(unit));
  }

  // Antes de ':id' para não colidir com as rotas parametrizadas.
  @Get('completions')
  listCompletions(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('unit') unit?: string,
  ) {
    const today = dayjs().format('YYYY-MM-DD');
    return this.eventsService.listCompletions(
      normalizeUnit(unit),
      start ?? today,
      end ?? today,
    );
  }

  @Post()
  create(@Body() dto: CreateCalendarEventDto, @Query('unit') unit?: string) {
    return this.eventsService.create(dto, normalizeUnit(unit));
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
    @Query('unit') unit?: string,
  ) {
    return this.eventsService.update(id, dto, normalizeUnit(unit));
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Query('unit') unit?: string) {
    return this.eventsService.remove(id, normalizeUnit(unit));
  }

  @Put(':id/completion')
  setCompletion(
    @Param('id') id: string,
    @Body() dto: SetCompletionDto,
    @Query('unit') unit?: string,
  ) {
    return this.eventsService.setCompletion(id, dto, normalizeUnit(unit));
  }
}
