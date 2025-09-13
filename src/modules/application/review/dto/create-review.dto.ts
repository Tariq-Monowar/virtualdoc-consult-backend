import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ 
    description: 'Rating from 1 to 5', 
    example: 5,
    minimum: 1,
    maximum: 5
  })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsNotEmpty()
  rating: number;

  @ApiProperty({ 
    description: 'Review text', 
    example: 'Great service, very professional doctor!',
    required: false
  })
  @IsString()
  @IsOptional()
  review?: string;

  @ApiProperty({ 
    description: 'Tags for the review', 
    example: ['Professional', 'Knowledgeable', 'Friendly'],
    required: false,
    type: [String]
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @ApiProperty({ 
    description: 'Appointment ID', 
    example: 'cm9s9043o0001uah0x52k31wh'
  })
  @IsString()  // Changed from @IsUUID() to @IsString()
  @IsNotEmpty()
  appointment_id: string;
}