import { IsString, IsEnum, IsOptional, IsArray } from 'class-validator';

enum Frequency {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
}

enum DaysOfWeek {
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
}

export class CreateScheduleDto {
  @IsString()
  date: string; // Store ISO Date as a string

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;

  @IsEnum(Frequency)
  frequency: Frequency;

  @IsOptional()
  @IsArray()
  @IsEnum(DaysOfWeek, { each: true })
  days_ofweek?: DaysOfWeek[];
}
