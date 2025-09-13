import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsNumber } from 'class-validator';

export class VerifyEmailDto {
  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @ApiProperty({
    description: 'Email address to verify',
    example: 'john.doe@example.com',
  })
  email: string;

  @IsNotEmpty({ message: 'Token cannot be empty' })
  @ApiProperty({
    description: 'Verification token received in email',
    example: 123456,
  })
  token: string;
}
