import { Optional } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  MinLength,
  IsEmail,
  IsString,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty({ message: 'Name cannot be empty' })
  @IsString()
  @ApiProperty({
    description: 'Full name of the user',
    example: 'John Doe',
    required: true,
  })
  name: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'First name of the user',
    example: 'John',
    required: false,
  })
  first_name?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Last name of the user',
    example: 'Doe',
    required: false,
  })
  last_name?: string;

  @IsNotEmpty({ message: 'Email cannot be empty' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @ApiProperty({
    description: 'Email address of the user',
    example: 'john.doe@example.com',
  })
  email: string;

  @IsNotEmpty({ message: 'Password cannot be empty' })
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  @ApiProperty({
    description: 'User password (minimum 6 characters)',
    example: 'password123',
  })
  password: string;

  @IsNotEmpty({ message: 'Phone number cannot be empty' })
  @IsString()
  @ApiProperty({
    description: 'Phone number',
    example: '01712345678',
  })
  phone_number: string;

  @Optional()
  @ApiProperty({
    description: 'Type of user',
    example: 'user',
    default: 'user',
  })
  type?: string;

  @ApiProperty({ required: false, description: 'User profession' })
  @IsString()
  @IsOptional()
  profession?: string;


  blacklist?: boolean;
}

// google-login.dto.ts
export class GoogleLoginDto {
  idToken: string;
  userType: 'user' | 'coach';
}
