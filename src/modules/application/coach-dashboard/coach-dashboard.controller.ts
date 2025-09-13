import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, HttpException, HttpStatus, Query } from '@nestjs/common';
import { CoachDashboardService } from './coach-dashboard.service';
import { CreateCoachDashboardDto } from './dto/create-coach-dashboard.dto';
import { UpdateCoachDashboardDto } from './dto/update-coach-dashboard.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { Role } from 'src/common/guard/role/role.enum';
import { Transaction } from '@prisma/client';
import { RolesGuard } from 'src/common/guard/role/roles.guard';


@Controller('coach-dashboard')
export class CoachDashboardController {
  constructor(private readonly coachDashboardService: CoachDashboardService) { }

  // @Post()
  // create(@Body() createCoachDashboardDto: CreateCoachDashboardDto) {
  //   return this.coachDashboardService.create(createCoachDashboardDto);
  // }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('all-consumer-list')
  async findAllConsumerlist(
    @Req() req: Request,
    //@Query('category') category?: string,

  ) {
    const user_id: string = req.user.userId;
    try {
      const response = await this.coachDashboardService.findAllconsumer(user_id)
      return response;
    } catch (error) {
      throw error;
    }
  }




  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Get('find-one-coach-appointment-calendar')
  async findAllAppointmentCalendar(
    @Req() req: Request,
    //@Query('category') category?: string,

  ) {
    const user_id: string = req.user.userId;
    try {
      const response = await this.coachDashboardService.findAllAppointmentCalendarDate(user_id)
      console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }



  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Get('find-one-coach-all-appointment')
  async findAllAppointment(
    @Req() req: Request,
    //@Query('category') category?: string,

  ) {
    const user_id: string = req.user.userId;
    try {
      const response = await this.coachDashboardService.findAllAppointments(user_id)
      console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Get('find-one-coach-all-appointment-subscription')
  async findAllAppointmentSubscription(
    @Req() req: Request,
    //@Query('category') category?: string,

  ) {
    const user_id: string = req.user.userId;
    try {
      const response = await this.coachDashboardService.findAllSubscription(user_id)
      // console.log('response', response)
      return response;
    } catch (error) {
      throw error;
    }
  }



  // @Get()
  // findAll() {
  //   console.log("sdkjhqdxiuhdjewhdiuhdiudh")
  //   return this.coachDashboardService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.coachDashboardService.findOne(+id);
  // }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Patch('confirm-subscription/:id')
  async update(
    @Param('id') id: string,
    @Req() req: Request) {
    const user_id: string = req.user.userId;
    const appointmentId: string = id;
    try {
      return this.coachDashboardService.updateSubscriptionApproval(user_id, appointmentId)



    }
    catch (error) {
      throw error;
    }


  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Patch('appointment-make-complete/:id')
  async Appointmentmakecomplete(
    @Param('id') id: string,
    @Req() req: Request) {
    const user_id: string = req.user.userId;
    const appointmentId: string = id;
    try {
      return this.coachDashboardService.makecomplete(user_id, appointmentId)

    }
    catch (error) {
      throw error;
    }

  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Get('transection-dashboard')
  async transactionDashboard(
    @Req() req: Request,
  ): Promise<{ totalWithdrawalAmount: number; transactions: Transaction[] }> {
    const userId: string = req.user.userId;
    try {
      const dashboardData = await this.coachDashboardService.getTransactionDashboard(userId);
      return dashboardData;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }



  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Get('allTransactions')
  async allTransactions(
    @Req() req: Request,
  ): Promise<Transaction[]> {
    const userId: string = req.user.userId;
    try {
      const transactions = await this.coachDashboardService.getalltransection(userId);
      return transactions;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }




  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Get('main-dashboard-data')
  async mainDashboard(
    @Req() req: Request,
  ) {
    const userId: string = req.user.userId;
    try {
      const dashboarData = await this.coachDashboardService.mainDashboardData(userId);
      return dashboarData;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch DashBoardData',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.coachDashboardService.remove(+id);
  // }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.COACH)
  @Get('income-chart-data')
  async IncomeChart(
    @Param('id') id: string,
    @Req() req: Request,
    @Query('range') range: string = '6') {
    const user_id: string = req.user.userId;
    const appointmentId: string = id;
    try {
      return this.coachDashboardService.incomeChartdetails(user_id, range)

    }
    catch (error) {
      throw error;
    }

  }




}
