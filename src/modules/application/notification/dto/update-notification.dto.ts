import { IsOptional, IsInt, IsDateString } from 'class-validator';

export class UpdateNotificationDto {
  @IsOptional()
  @IsInt()
  status?: number;

  @IsOptional()
  @IsDateString()
  read_at?: string;
}
