import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UseInterceptors, UploadedFiles } from '@nestjs/common';
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@ApiTags('Blogs')
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) { }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'documents', maxCount: 5 },
      ],
      {
        storage: memoryStorage(),
      },
    ),
  )
  create(
    @Req() req: Request,
    @Body() createBlogDto: CreateBlogDto,
    @UploadedFiles()
    files: {
      documents?: Express.Multer.File[];
    },) {
    console.log(files)
    console.log(req.body);
    try {
      const user_id: string = req.user.userId;
      return this.blogService.createblog({ dto: createBlogDto, userId: user_id, documents: files?.documents });
    } catch (error) {
      throw error;
    }

  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('get-all-blogs')
  findAll() {
    return this.blogService.findAll();
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('singe-coach-blogs/:id')
  findSingleCoachBlogs(

    @Param('id') id: string
  ) {
    return this.blogService.findAllSinglecoacheblogs(id);
  }



  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('single-blog/:id')
  findOne(@Param('id') id: string) {
    return this.blogService.findOne(id);
  }



  @Patch(':id')
  update(@Param('id') id: string, @Body() updateBlogDto: UpdateBlogDto) {
    return this.blogService.update(+id, updateBlogDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.blogService.remove(+id);
  }
}
