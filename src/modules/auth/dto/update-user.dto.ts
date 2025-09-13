import { ApiProperty, PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsInt, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsOptional()
  @ApiProperty({
    description: 'Age of the user',
    example: '30',
  })
  age?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({
    description: 'Languages spoken by the user',
    example: ['English', 'Spanish'],
  })
  language?: string[];

  // @IsOptional()
  // @IsString()
  // @ApiProperty({
  //   description: 'Education level of the user',
  //   example: "Bachelor's Degree",
  // })
  // education?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'experience level of the user',
    example: 'MBBS',
  })
  experience?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Address of the user',
    example: 'House#2, Block#10, Street#12, Area#11',
  })
  address?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'Country of the user',
    example: 'Nigeria',
  })
  country?: string;

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'City of the user',
    example: 'Lagos',
  })
  city?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Phone number',
    example: '+91 9876543210',
  })
  phone_number?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Gender',
    example: 'male',
  })
  gender?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Date of birth',
    example: '14/11/2001',
  })
  date_of_birth?: string;

  @ApiProperty({ required: false, description: 'User profession' })
  @IsString()
  @IsOptional()
  profession?: string;

  /**
   * An array of education records.
   * Each object must include title, institution, and year.
   * e.g.
   * [
   *   {
   *     "title": "Bachelor's Degree",
   *     "institution": "University of Lagos",
   *     "year": 2018
   *   },
   *   {
   *     "title": "Master's Degree",
   *     "institution": "University of Ibadan",
   *     "year": 2021
   *   }
   * ]
   */
  @IsOptional()
  @IsArray()
  @IsObject({ each: true })
  @Transform(({ value }) => {
    // value will be the JSON string from form-data
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @ApiProperty({
    description: 'Array of education entries (title, institution, year)',
    type: [Object],
    example: [
      {
        title: "Bachelor's Degree",
        institution: 'University of Lagos',
        year: 2018,
      },
      {
        title: "Master's Degree",
        institution: 'University of Ibadan',
        year: 2021,
      },
    ],
  })
  education?: Array<{
    title: string;
    institution: string;
    year: number;
  }>;

  /**
   * A JSON‐array of the user's skills.
   * e.g. ['JavaScript', 'TypeScript', 'NestJS', 'PostgreSQL']
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  })
  @ApiProperty({
    description: 'Array of skills (JSON)',
    type: [String],
    example: ['JavaScript', 'TypeScript', 'NestJS', 'PostgreSQL'],
  })
  skills?: string[];

  @IsOptional()
  @IsString()
  @ApiProperty({
    description: 'bio of the user',
    example: 'I am a software engineer',
  })
  bio?: string;
}
