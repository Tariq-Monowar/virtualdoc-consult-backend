import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query, HttpException, HttpStatus } from '@nestjs/common';
import { UserDashboardService } from './user-dashboard.service';
import { CreateUserDashboardDto } from './dto/create-user-dashboard.dto';
import { UpdateUserDashboardDto } from './dto/update-user-dashboard.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { string } from 'zod';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { Transaction } from '@prisma/client';

@ApiTags('User-Dashboard')
@Controller('user-dashboard')
export class UserDashboardController {
  constructor(private readonly userDashboardService: UserDashboardService) {}

  @Post()
  create(@Body() createUserDashboardDto: CreateUserDashboardDto) {
    return this.userDashboardService.create(createUserDashboardDto);
  }
 

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('all-hired-coachs')
  async findAll(
        @Req() req: Request,
        @Query('category') category?: string,
        
  ) {
    const user_id : string = req.user.userId;
    try {
    const response = await this.userDashboardService.findAllHiredCoach(user_id, category)
    return response;
    } catch (error) {
      throw error;  
  }
}


@ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('user-dashboard-data')
  async dashboardData(
        @Req() req: Request,
       // @Query('category') category?: string,
        
  ) {
    const user_id : string = req.user.userId;
    try {
    const response = await this.userDashboardService.findDashboardData(user_id)
    return response;
    } catch (error) {
      throw error;  
  }
}


 @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.USER)
  @Get('find-one-user-appointment-subscription')
  async findAllAppointmentSubscription(
    @Req() req: Request,
    //@Query('category') category?: string,

  ) {
    const user_id: string = req.user.userId;
    try {
      const response = await this.userDashboardService.findAllSubscription(user_id)
      // console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }


  
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Roles(Role.USER)
  @Get('find-one-user-appointment-calendar')
  async findAllAppointmentCalendar(
    @Req() req: Request,
    //@Query('category') category?: string,

  ) {
    const user_id: string = req.user.userId;
    try {
      const response = await this.userDashboardService.findAllAppointmentCalendarDate(user_id)
      console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }


  
    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Roles(Role.USER)
    @Get('user-allTransactions')
    async allTransactions(
      @Req() req: Request,
    ): Promise<Transaction[]> {
      const userId: string = req.user.userId;
      try {
        const transactions = await this.userDashboardService.getalltransection(userId);
        return transactions;
      } catch (error) {
        throw new HttpException(
          'Failed to fetch transactions',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }





  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userDashboardService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDashboardDto: UpdateUserDashboardDto) {
    return this.userDashboardService.update(+id, updateUserDashboardDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userDashboardService.remove(+id);
  }
}
