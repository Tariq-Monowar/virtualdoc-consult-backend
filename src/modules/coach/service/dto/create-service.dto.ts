import { IsString, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { DaysOfWeek, Frequency } from '@prisma/client';

export type ScheduleDto = {
  date: string; // Store ISO Date as a string

  startTime: string;

  endTime: string;

  frequency: Frequency;

   days_ofweek?: DaysOfWeek[];
}

export class CreateServiceDto {
  @IsString()
  category: string;

  @IsString()
  service_provider_name: string;

  @IsString()
  descriptions: string;

  // @IsArray()
  // @ValidateNested({ each: true })
  // @Type(() => CreateScheduleDto)
  schedules: string;

  @IsString()
  certification: string;

  @IsString()
  duration: string;

  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  @IsInt()
  price: number;

  @Transform(({ value }) => parseInt(value, 10), { toClassOnly: true })
  @IsInt()
  total_slot: number;

  //@IsArray()
  questions? : string[]

  // @IsString()
  user_id?: string;
}
