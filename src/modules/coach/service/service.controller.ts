import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, UseInterceptors, UploadedFiles, Query, Res, HttpStatus, HttpException } from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { RolesGuard } from 'src/common/guard/role/roles.guard';

@Controller('service')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) { }


  @ApiOperation({ summary: 'Coch Service' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Post('create')
  @UseInterceptors(
    // FileInterceptor('avatar', {
    //   storage: memoryStorage(),
    // }),
    // FileInterceptor('documents', {
    //   storage: memoryStorage(),
    // }),
    FileFieldsInterceptor(
      [
        { name: 'thumbnail', maxCount: 1 },
        { name: 'certificates', maxCount: 10 },
      ],
      {
        storage: memoryStorage(),
      },
    ),
  )

  async create(
    @Req() req: Request,

    @Body() createServiceDto: CreateServiceDto,

    @UploadedFiles()
    files?: {
      thumbnail?: Express.Multer.File[];
      certificates?: Express.Multer.File[];
    }) {
    try {
      const user_id = req?.user.userId;
      return await this.serviceService.create({ createServiceDto, userId: user_id, thumbnail: files?.thumbnail?.[0], certificates: files.certificates });
    }
    catch (error) {
      console.log(error)
      return {
        success: false,
        message: 'Failed to Create Coach Service',
      };
    }


  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Patch('service-update')
  async manualRefresh(@Query('serviceId') serviceId: string) {
    return await this.serviceService.regenerateSchedulesAndSlotsManually(serviceId);
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.ADMIN)
  @Get("all-coaches-services")
  async findAll(
    @Query('limit') limit: string,
    @Query('page') page: string,
  ) {
    try {
      const limitNum = parseInt(limit) || 10;
      const pageNum = parseInt(page) || 1;

      const result = await this.serviceService.findAllWithPagination(limitNum, pageNum);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('Error fetching service documents:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get("my-services/:id")
  async findMyServices(
    @Param('id') id: string,
    // @Req() req: Request

    // @Query('limit') limit: string,
    // @Query('page') page: string,
  ) {
    try {
      // const userId = req.user.userId;
      // console.log(userId,"420") // JWT payload contains user id
      // const limitNum = parseInt(limit) || 10;
      // const pageNum = parseInt(page) || 1;

      const result = await this.serviceService.findAllByUserId(id);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      console.error('Error fetching user service documents:', error);
      throw new HttpException(
        {
          success: false,
          message: 'Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.serviceService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateServiceDto: UpdateServiceDto) {
    return this.serviceService.update(+id, updateServiceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.serviceService.remove(+id);
  }
}
