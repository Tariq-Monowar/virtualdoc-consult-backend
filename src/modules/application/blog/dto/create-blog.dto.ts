// blog.dto.ts
import { PartialType } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateBlogDto {
  @IsString()
  @IsNotEmpty()
  title: string;

 
  category: string;

  @IsString()
  @IsNotEmpty()
  readingTime: string;

  @IsString()
  @IsNotEmpty()
  content: string; // HTML content

  description? : string; 

  // @IsString()
  // @IsNotEmpty()
  // thumbnail: string;
}

export class UpdateBlogDto extends PartialType(CreateBlogDto) {}