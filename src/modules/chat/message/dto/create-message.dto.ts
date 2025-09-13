// Update the DTO to make appointment_id optional
import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The id of the conversation',
  })
  conversation_id: string;

  @IsNotEmpty()
  @IsString()
  @ApiProperty({
    description: 'The id of the receiver',
  })
  receiver_id: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The message text',
  })
  message?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'The id of the appointment',
  })
  appointment_id?: string;
}
