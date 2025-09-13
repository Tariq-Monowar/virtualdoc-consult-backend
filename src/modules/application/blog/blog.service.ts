import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { Prisma } from '@prisma/client';
// import * as DOMPurify from 'dompurify';
// import { JSDOM } from 'jsdom';

@Injectable()
export class BlogService {
  constructor(private prisma: PrismaService) { }

  // private sanitizeHtml(html: string): string {
  //   const window = new JSDOM('').window;
  //   const purify = DOMPurify(window);
  //   return purify.sanitize(html);
  // }

  async createblog({ dto, userId, documents }: { dto: CreateBlogDto; userId: string; documents?: Express.Multer.File[]; }) {
    console.log("Input data:", { dto, userId, documents });

    // First create the blog post
    const blog = await this.prisma.blog.create({
      data: {
        user_id: userId,
        title: dto.title,
        category: dto.category,
        readingTime: dto.readingTime,
        content: dto.content,
        description: dto.description,
      },
    });

    // Then handle documents if they exist
    if (documents && documents.length > 0) {
      const uploadedImages: {
        file_name: string;
        mime_type: string;
        file_path: string;
      }[] = [];

      for (const image of documents) {
        try {

          const existingDocs = await this.prisma.blogDocument.findMany({
            where: {
              user_id: userId,
              file_name: image.originalname,
            },
          });


          for (const doc of existingDocs) {
            await SojebStorage.delete(
              appConfig().storageUrl.documents + doc.file_path,
            );
            await this.prisma.blogDocument.delete({
              where: { id: doc.id },
            });
          }


          const fileName = `${Date.now()}_${image.originalname}`;

          await SojebStorage.put(
            appConfig().storageUrl.documents + fileName,
            image.buffer,
          );

          uploadedImages.push({
            file_name: image.originalname,
            mime_type: image.mimetype,
            file_path: fileName,
          });
        } catch (error) {
          console.error(
            `Error uploading document: ${image.originalname}`,
            error,
          );
        }
      }


      if (uploadedImages.length > 0) {
        await this.prisma.blogDocument.createMany({
          data: uploadedImages.map((file) => ({
            user_id: userId,
            blog_id: blog.id,
            file_path: file.file_path,
            file_name: file.file_name,
            file_type: file.mime_type,
          })),
        });
      }
    }

    return blog;
  }

  async findAll() {
    try {
      const blogs = await this.prisma.blog.findMany({
        select: {
          id: true,
          user_id: true,
          user: {
            select: {
              name: true,
              avatar: true,
              categories: true
            }
          },
          title: true,
          category: true,
          readingTime: true,
          createdAt: true,
          updatedAt: true,
          description: true,

          blog_documents: true

        }
      });
      return blogs;
    } catch (error) {
      // Handle specific Prisma errors if needed
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        // Handle known Prisma errors (e.g., unique constraint violation)
        throw new Error(`Database error: ${error.message}`);
      } else if (error instanceof Prisma.PrismaClientUnknownRequestError) {
        // Handle unknown Prisma errors
        throw new Error(`Unknown database error occurred`);
      } else {
        // Handle other unexpected errors
        throw new Error(`Failed to fetch blogs: ${error.message}`);
      }
    }
  }

  async findOne(id: string) {
    // Input validation
    if (!id || typeof id !== 'string') {
      throw new BadRequestException('Invalid ID format');
    }

    try {
      const blog = await this.prisma.blog.findUnique({
        where: { id },
        include: {
          blog_documents: true, // Include user relation if needed  
        }
      });

      if (!blog) {
        throw new NotFoundException(`Blog with ID ${id} not found`);
      }

      return blog;
    } catch (error) {
      // Handle specific Prisma errors if needed
      if (error.code === 'P2023') {
        throw new BadRequestException('Malformed ID');
      }

      // Re-throw NestJS specific errors
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }

      // Log unexpected errors (consider using a logger service)
      console.error(`Error in findOne: ${error.message}`);
      throw new Error('Failed to fetch blog');
    }
  }

  update(id: number, updateBlogDto: UpdateBlogDto) {
    return `This action updates a #${id} blog`;
  }

  remove(id: number) {
    return `This action removes a #${id} blog`;
  }


  findAllSinglecoacheblogs(id: string) {
    try {
      return this.prisma.blog.findMany({
        where: {
          user_id: id,
        },
        select: {
          id: true,
          user_id: true,
          user: {
            select: {
              name: true,
              avatar: true,
              categories: true
            }
          },
          title: true,
          category: true,
          readingTime: true,
          createdAt: true,
          updatedAt: true,
          description: true,

          blog_documents: true

        }
      });
    }
    catch (error) {
      throw error;
    }
  }
}
