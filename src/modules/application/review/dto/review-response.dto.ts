import { ApiProperty } from '@nestjs/swagger';

export class ReviewResponseDto {
  @ApiProperty({ example: 'clg7pqxk10000gg0ufz6g8x9d' })
  id: string;

  @ApiProperty({ example: '2023-05-15T10:30:00.000Z' })
  created_at: Date;

  @ApiProperty({ example: '2023-05-15T10:30:00.000Z' })
  updated_at: Date;

  @ApiProperty({ example: null, nullable: true })
  deleted_at: Date | null;

  @ApiProperty({ example: 5 })
  rating: number;

  @ApiProperty({ example: 'Great service, very professional doctor!' })
  review: string | null;

  @ApiProperty({ example: ['Professional', 'Knowledgeable', 'Friendly'] })
  tags: string[];

  @ApiProperty({ example: 'clg7pqxk10000gg0ufz6g8x9d' })
  appointment_id: string;

  @ApiProperty({ example: 'clg7pqxk10000gg0ufz6g8x9d' })
  reviewer_id: string;

  @ApiProperty({ example: 'clg7pqxk10000gg0ufz6g8x9d' })
  service_id: string;

  @ApiProperty({
    example: {
      id: 'clg7pqxk10000gg0ufz6g8x9d',
      name: 'John Doe',
      avatar: 'https://example.com/avatar.jpg'
    }
  })
  reviewer?: any;

  @ApiProperty({
    example: {
      id: 'clg7pqxk10000gg0ufz6g8x9d',
      service_provider_name: 'Dr. Jane Smith',
      category: 'Cardiology'
    }
  })
  service?: any;
}