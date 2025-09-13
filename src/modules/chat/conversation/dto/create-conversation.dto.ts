import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The id of the creator',
  })
  creator_id: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The id of the participant',
  })
  participant_id: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The id of the appointment',
  })

  @IsOptional()
  @IsString()
  appointment_id?: string;
}
