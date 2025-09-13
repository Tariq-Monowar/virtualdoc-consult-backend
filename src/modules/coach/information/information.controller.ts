import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { InformationService } from './information.service';
import { CreateInformationDto } from './dto/create-information.dto';
import { UpdateInformationDto } from './dto/update-information.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@Controller('information')


export class InformationController {
  constructor(private readonly informationService: InformationService) {}
  

  @Post()
  create(@Body() createInformationDto: CreateInformationDto) {
    return this.informationService.create(createInformationDto);
  }

  @Get()
  findAll() {
    return this.informationService.findAll();
  }



  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  //@Roles(Role.ADMIN)
  @Get("all-filter-coach")
  async findAllFiltered(
    @Query('limit') limit: string,
    @Query('page') page: string,
    @Query('category') category: string,
    @Query('min_price') min_price: string,
    @Query('max_price') max_price: string,
    @Query('gender') gender: string,
  ) {
    return this.informationService.filterCoaches(
      limit ? parseInt(limit) : 10,
      page ? parseInt(page) : 1,
      category,
      min_price ? parseInt(min_price) : undefined,
      max_price ? parseInt(max_price) : undefined,
      gender
    );
  }


  @UseGuards(JwtAuthGuard)
  @Get('one-coach-details/:id')
  findOne(@Param('id') id: string) {
    return this.informationService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateInformationDto: UpdateInformationDto) {
    return this.informationService.update(+id, updateInformationDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.informationService.remove(+id);
  }
}




// @ApiBearerAuth()
//   @UseGuards(JwtAuthGuard)
//   @Roles(Role.ADMIN)
//   @Get("all-coaches-services")
//   async findAll(
//     @Query('limit') limit: string,
//     @Query('page') page: string,
//   ) {
//     try {
//       const limitNum = parseInt(limit) || 10;
//       const pageNum = parseInt(page) || 1;

//       const result = await this.serviceService.findAllWithPagination(limitNum, pageNum);

//       return {
//         success: true,
//         ...result,
//       };
//     } catch (error) {
//       console.error('Error fetching service documents:', error);
//       throw new HttpException(
//         {
//           success: false,
//           message: 'Server Error',
//         },
//         HttpStatus.INTERNAL_SERVER_ERROR,
//       );
//     }
//   }
