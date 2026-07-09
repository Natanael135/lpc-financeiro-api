import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { HolidaysService } from './holidays.service';
import { CreateHolidayDto } from './dto/create-holiday.dto';
import { UpdateHolidayDto } from './dto/update-holiday.dto';

@Controller('holidays')
export class HolidaysController {
  constructor(private readonly holidaysService: HolidaysService) {}

  @Get()
  list(
    @Query('start') start?: string,
    @Query('end') end?: string,
    @Query('year') year?: string,
  ) {
    if (year) {
      return this.holidaysService.listRange(`${year}-01-01`, `${year}-12-31`);
    }
    const y = new Date().getFullYear();
    return this.holidaysService.listRange(
      start ?? `${y}-01-01`,
      end ?? `${y}-12-31`,
    );
  }

  @Post()
  create(@Body() dto: CreateHolidayDto) {
    return this.holidaysService.create(dto);
  }

  @Post('import/:year')
  importYear(@Param('year', ParseIntPipe) year: number) {
    return this.holidaysService.importYear(year);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateHolidayDto) {
    return this.holidaysService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.holidaysService.remove(id);
  }
}
