import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto, CreatePaymentIntentDto, CreateSlotDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Appointment } from '@prisma/client';
import { Request } from 'express';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';

@ApiTags('appointments')
@Controller('appointment')
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    @InjectQueue('appointment-queue') private readonly appointmentQueue: Queue,) { }


  @UseGuards(JwtAuthGuard)
  @Post("create-appointment")
  @ApiOperation({ summary: 'Create a new appointment' })
  async create(
    @Body() createAppointmentDto: CreateAppointmentDto,
  ): Promise<Appointment> {
    return this.appointmentService.createAppointment(createAppointmentDto);
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("reserve-slot")
  @ApiOperation({ summary: 'reserve A Slot' })
  async reserveSlot(
    @Body() createAppointmentDto: CreateAppointmentDto,
    @Req() req: Request,) {
    const user_id = req.user.userId;
    try {
      const result = await this.appointmentService.reserveSlot({ userId: user_id, createAppointmentDto });


      const { id } = result;
      const slotId = createAppointmentDto.slotId

      console.log(id, slotId, user_id, "id, slotId, user_id");
      //console.log("started 1");

      // Schedule the job to run after 10 minutes
      await this.appointmentQueue.add(
        'appointment-slot-check',
        { user_id, id, slotId },
        //{ delay: 40_000 }, // 40 seconds delay
         { delay: 600_000 }, // 10 minutes delay
        // { delay: 60_000 } // 1 minute delay

      );

      return result;

    }
    catch (error) {
      // throw error
      return error
    }
  }


  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("reserve-appointment-with-pay")
  @ApiOperation({ summary: 'reserve A Appointment' })
  async reserveAppointment(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto, // Changed parameter name to camelCase
    @Req() req: Request,
  ) {
    const user_id = req.user.userId;
    try {
      return await this.appointmentService.createPaymentIntent({
        userId: user_id,
        createPaymentIntentDto // Changed to match the expected parameter name
      });
    }
    catch (error) {
      throw error;
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch("appointment-slot-check")
  @ApiOperation({ summary: 'Appointment Check' })
  async checkAppointment(
    // @Body() createPaymentIntentDto: CreatePaymentIntentDto, // Changed parameter name to camelCase
    @Req() req: Request,
    @Query('appointmentId') appointmentId?: string,
    @Query('slotId') slotId?: string,
  ) {
    const user_id = req.user.userId;
    try {
      return await this.appointmentService.appointmentCheck({
        userId: user_id,
        appointmentId, // Changed to match the expected parameter name
        slotId
      });
    }
    catch (error) {
      throw error;
    }
  }



  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("reserve-subscription-coach-aprove")
  @ApiOperation({ summary: 'Reserve Subscription Coach Aprove' })
  async reserveSubscription(
    @Body() createAppointmentDto: CreateAppointmentDto,

    @Req() req: Request,
  ) {
    const user_id = req.user.userId;
    try {
      return await this.appointmentService.reserveSubscriptions({ userId: user_id, createAppointmentDto });


    }
    catch (error) {
      throw error
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post("reserve-subscription-with-pay")
  @ApiOperation({ summary: 'reserve A Subscription' })
  async reserveSubscriptionwithPay(
    @Body() createPaymentIntentDto: CreatePaymentIntentDto, // Changed parameter name to camelCase
    @Req() req: Request,
  ) {
    const user_id = req.user.userId;
    try {
      return await this.appointmentService.createPaymentIntentSubcription({
        userId: user_id,
        createPaymentIntentDto // Changed to match the expected parameter name
      });
    }
    catch (error) {
      throw error;
    }
  }




  @Get()
  findAll() {
    return this.appointmentService.findAll();
  }

  @Get(':id')
  findOneAppointment(@Param('id') id: string) {
    return this.appointmentService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAppointmentDto: UpdateAppointmentDto) {
    return this.appointmentService.update(+id, updateAppointmentDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.appointmentService.remove(+id);
  }
}
