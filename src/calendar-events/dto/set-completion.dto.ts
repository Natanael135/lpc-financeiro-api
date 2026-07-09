import { IsBoolean, Matches } from 'class-validator';
import { DATE_REGEX } from './create-calendar-event.dto';

export class SetCompletionDto {
  @Matches(DATE_REGEX, { message: 'date deve ser YYYY-MM-DD' })
  date: string;

  @IsBoolean()
  done: boolean;
}
