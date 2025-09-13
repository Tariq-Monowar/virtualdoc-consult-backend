import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateContactDto {
  @ApiProperty()
  name?: string;


  @IsEmail()
  @IsNotEmpty()
  @ApiProperty()
  email: string;

  @ApiProperty()
  position?: string;

  @IsNotEmpty()
  @ApiProperty()
  message: string;
}
