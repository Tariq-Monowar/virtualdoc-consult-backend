// src/appointments/appointments.service.ts
import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  HttpException
} from '@nestjs/common';
import { Stripe } from 'stripe';

import {
  Appointment,
  AppointmentStatus,
  Prisma,
  Service,
  Schedule,
  Slot
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CreateAppointmentDto, CreatePaymentIntentDto } from './dto/create-appointment.dto';
import appConfig from 'src/config/app.config';
import { error } from 'console';

@Injectable()
export class AppointmentService {
  //private readonly stripe: Stripe;
  constructor(private readonly prisma: PrismaService) { }



  async createAppointment(data: {
    userId: string;
    serviceId: string;
    scheduleId: string;
    slotId: string;
    paymentMethod?: string;
    paymentDetails?: any;
    personalInfo?: any;
    questionAnswers?: any[];
  }): Promise<Appointment> {
    return await this.prisma.$transaction(async (prisma) => {
      // 1. Validate all required entities exist and get their data
      const [user, service, schedule, slot] = await Promise.all([
        prisma.user.findUnique({ where: { id: data.userId } }),
        prisma.service.findUnique({
          where: { id: data.serviceId },
          include: { schedules: true }
        }),
        prisma.schedule.findUnique({
          where: { id: data.scheduleId },
          include: { slots: true }
        }),
        prisma.slot.findUnique({
          where: { id: data.slotId },
          include: { appointment: true }
        }),
      ]);



      // 5. Create the appointment
      const appointment = await prisma.appointment.create({
        data: {
          user_id: data.userId,
          service_id: data.serviceId,
          schedule_id: data.scheduleId,
          slot_id: data.slotId,
          paymentMethod: data.paymentMethod || 'UNPAID',
          paymentDetails: data.paymentDetails || {},
          personalInfo: data.personalInfo || {},
          questionAnswers: data.questionAnswers || [],
          status: 'PENDING',
        },
        include: {
          user: true,
          service: true,
          schedule: true,
          slot: true,
        },
      });

      // 6. Mark slot as booked
      await prisma.slot.update({
        where: { id: data.slotId },
        data: { is_booked: true },
      });

      return appointment;
    }).catch(error => {
      // Handle specific Prisma errors
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002': // Unique constraint
            throw new ConflictException('Appointment already exists');
          case 'P2003': // Foreign key constraint
            throw new BadRequestException('Invalid reference ID provided');
          case 'P2025': // Not found
            throw new NotFoundException('Related record not found');
        }
      }
      throw error; // Re-throw other errors
    });
  }

  async getAppointmentById(id: string): Promise<Appointment | null> {
    return this.prisma.appointment.findUnique({
      where: { id },
      include: {
        user: true,
        service: true,
        schedule: true,
        slot: true,
      },
    });
  }

  async updateAppointmentStatus(
    id: string,
    status: AppointmentStatus,
  ): Promise<Appointment> {
    try {
      return await this.prisma.appointment.update({
        where: { id },
        data: { status },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async cancelAppointment(id: string): Promise<Appointment> {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const appointment = await prisma.appointment.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: { slot: true },
        });

        if (appointment.slot) {
          await prisma.slot.update({
            where: { id: appointment.slot.id },
            data: { is_booked: false },
          });
        }

        return appointment;
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async getServiceAppointments(serviceId: string): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: { service_id: serviceId },
      include: {
        user: true,
        service: true,
        schedule: true,
        slot: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async getUserAppointments(userId: string): Promise<Appointment[]> {
    return this.prisma.appointment.findMany({
      where: { user_id: userId },
      include: {
        service: true,
        schedule: true,
        slot: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  private async validateEntitiesExist(data: {
    userId: string;
    serviceId: string;
    scheduleId: string;
    slotId: string;
  }) {
    const [user, service, schedule, slot] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: data.userId } }),
      this.prisma.service.findUnique({ where: { id: data.serviceId } }),
      this.prisma.schedule.findUnique({
        where: { id: data.scheduleId },
        include: { slots: true }
      }),
      this.prisma.slot.findUnique({ where: { id: data.slotId } }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!service) throw new NotFoundException('Service not found');
    if (!schedule) throw new NotFoundException('Schedule not found');
    if (!slot) throw new NotFoundException('Slot not found');

    // Verify the slot belongs to the schedule
    if (slot.schedule_id !== data.scheduleId) {
      throw new BadRequestException('Slot does not belong to the provided schedule');
    }

    // Verify the schedule belongs to the service
    if (schedule.service_id !== data.serviceId) {
      throw new BadRequestException('Schedule does not belong to the provided service');
    }
  }

  private async isSlotAvailable(slotId: string): Promise<boolean> {
    const slot = await this.prisma.slot.findUnique({
      where: { id: slotId },
      include: {
        appointment: {
          where: {
            status: {
              not: 'CANCELLED',
            },
          },
        },
      },
    });

    if (!slot) return false;
    return !slot.is_booked && slot.appointment.length === 0;
  }

  private handlePrismaError(error: any) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002':
          throw new ConflictException('Unique constraint violation');
        case 'P2003':
          throw new BadRequestException('Foreign key constraint failed');
        case 'P2025':
          throw new NotFoundException('Record not found');
        default:
          throw new BadRequestException('Database error occurred');
      }
    }
    throw error;
  }


  async reserveSlot(
    {
      userId,
      createAppointmentDto,
    }: {
      userId: string;
      createAppointmentDto: CreateAppointmentDto;
    }
  ) {
    try {

      const data: any = {};
      if (createAppointmentDto.serviceId) data.serviceId = createAppointmentDto.serviceId;
      if (createAppointmentDto.scheduleId) data.scheduleId = createAppointmentDto.scheduleId;
      if (createAppointmentDto.slotId) data.slotId = createAppointmentDto.slotId;
      if (createAppointmentDto.status) data.status = createAppointmentDto.status;
      if (createAppointmentDto.paymentMethod) data.paymentMethod = createAppointmentDto.paymentMethod;
      if (createAppointmentDto.paymentDetails) data.paymentDetails = createAppointmentDto.paymentDetails;
      if (createAppointmentDto.personalInfo) data.personalInfo = createAppointmentDto.personalInfo;
      if (createAppointmentDto.questionAnswers) data.questionAnswers = createAppointmentDto.questionAnswers;

      const [user, service, schedule, slot] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.service.findUnique({
          where: { id: data.serviceId },
          include: { schedules: true }
        }),
        this.prisma.schedule.findUnique({
          where: { id: data.scheduleId },
          include: { slots: true }
        }),
        this.prisma.slot.findUnique({
          where: { id: data.slotId },
          include: { appointment: true }
        }),
      ]);

      if (!user) throw new NotFoundException('User not found');
      if(user.type ==='coach' || user.type === 'admin') throw new NotFoundException('coach can not book the appointment')
      if (!service) throw new NotFoundException('Service not found');
      if (!schedule) throw new NotFoundException('Schedule not found');
      if (!slot) throw new NotFoundException('Slot not found');


      if (slot.status !== 'AVAILABLE') {

        throw new BadRequestException('Slot is not available')
      }

      if (slot.schedule_id !== schedule.id) {
        throw new BadRequestException('Slot does not belong to the selected schedule');
      }

      if (schedule.service_id !== service.id) {
        throw new BadRequestException('Schedule does not belong to the selected service');
      }


      if (new Date(slot.date) < new Date()) {
        throw new BadRequestException('Cannot book past time slots');
      }

      const appointment = await this.prisma.appointment.create({
        data: {
          user_id: userId,
          service_id: data.serviceId,
          schedule_id: data.scheduleId,
          slot_id: data.slotId,
          paymentMethod: data.paymentMethod || 'UNPAID',
          paymentDetails: data.paymentDetails || {},
          personalInfo: data.personalInfo || {},
          questionAnswers: data.questionAnswers || [],
          status: 'PENDING',
          type: "ONE TIME",
        },
        include: {
          user: true,
          service: true,
          schedule: true,
          slot: true,
        },
      });

      await this.prisma.slot.update({
        where: { id: data.slotId },
        data: { status: 'PENDING' },
      });

      return appointment;

    }
    catch (err) {
      throw err;

    }


  }


  // src/payments/payments.service.ts (updated methods only)

  // Update the createPaymentIntent method
  async createPaymentIntent(
    {
      userId,
      createPaymentIntentDto,
    }: {
      userId: string;
      createPaymentIntentDto: CreatePaymentIntentDto;
    }
  ) {
    const { amount, currency, appointmentId } = createPaymentIntentDto;
    const STRIPE_SECRET_KEY = appConfig().payment.stripe.secret_key;
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        userId,
        appointmentId,
      },
      payment_method_types: ['card'],
    });
   const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId }, 
      include: {
        //user: true,
        service: true,
        // schedule: true,
        // slot: true,
      },
      });


   // console.log(appointment, "appointmentsdfwefffcfffccfdcc");
    await this.prisma.transaction.create({
      data: {
        amount,
        type: 'PAYMENT',
        status: 'PENDING',
        currency,
        description: `Payment for appointment ${appointmentId}`,
        // wallet: {
        //   connect: { userId },
        // },
        getuser: { connect: { id: appointment?.service?.user_id } },
        // getuserId : appointment?.user_id,
        user: { connect: { id: userId } },
        appointment: { connect: { id: appointmentId } },
        stripePaymentId: paymentIntent.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }
  

  async appointmentCheck({
  userId,
  appointmentId,
  slotId
}: {
  userId: string;
  appointmentId: string;
  slotId: string;
}) {
  try {
    //console.log("lalalalalalala" , userId, appointmentId, slotId, "userId, appointmentId, slotId");
    // Use transaction to ensure both updates succeed or fail together
    return await this.prisma.$transaction(async (prisma) => {
      // Check and update appointment
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { slot: true }
      });

      if (!appointment) {
        throw new BadRequestException('Appointment not found');
      }

      if (appointment.status === "PENDING") {
        await prisma.appointment.update({
          where: { id: appointmentId },
          data: { status: "CANCELLED" }
        });
      }

      // Check and update slot
      const slot = await prisma.slot.findUnique({
        where: { id: slotId }
      });

      if (!slot) {
        throw new BadRequestException('Slot not found');
      }

      if (slot.status === "PENDING") {
        await prisma.slot.update({
          where: { id: slotId },
          data: { status: "AVAILABLE" }
        });
      }

      return "Appointment cancelled successfully";
    });
  } catch (err) {
    // Log the error for debugging
    console.error('Error in appointmentCheck:', err);
    
    // Check if the error is already an HTTP exception
    if (err instanceof HttpException) {
      throw err;
    }
    
    // For other errors, throw internal server error with details
    throw new InternalServerErrorException({
      message: 'Failed to process appointment cancellation',
      error: err.message
    });
  }
}






  async reserveSubscriptions(
    {
      userId,
      createAppointmentDto,
    }: {
      userId: string;
      createAppointmentDto: CreateAppointmentDto;
    }
  ) {
    try {

      const data: any = {};
      if (createAppointmentDto.serviceId) data.serviceId = createAppointmentDto.serviceId;
      if (createAppointmentDto.scheduleId) data.scheduleId = createAppointmentDto.scheduleId;
      //if (createAppointmentDto.slotId) data.slotId = createAppointmentDto.slotId;
      if (createAppointmentDto.status) data.status = createAppointmentDto.status;
      if (createAppointmentDto.paymentMethod) data.paymentMethod = createAppointmentDto.paymentMethod;
      if (createAppointmentDto.paymentDetails) data.paymentDetails = createAppointmentDto.paymentDetails;
      if (createAppointmentDto.personalInfo) data.personalInfo = createAppointmentDto.personalInfo;
      if (createAppointmentDto.questionAnswers) data.questionAnswers = createAppointmentDto.questionAnswers;

      const [user, service, schedule, slot] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: userId } }),
        this.prisma.service.findUnique({
          where: { id: data.serviceId },
          include: { schedules: true }
        }),
        this.prisma.schedule.findUnique({
          where: { id: data.scheduleId },
          include: { slots: true }
        }),
        // this.prisma.slot.findUnique({
        //   where: { id: data.slotId },
        //   include: { appointment: true }
        // }),
        // First, get the count of all slots with the desired scheduleId


     

      // Finally, get a random slot with the scheduleId
       this.prisma.slot.findFirst({
        where: { schedule_id: data.scheduleId },
        
       
      })
      ]);
      
      if (!user) throw new NotFoundException('User not found');
      if (!service) throw new NotFoundException('Service not found');
      if (!schedule) throw new NotFoundException('Schedule not found');
      //if (!slot) throw new NotFoundException('Slot not found');


      // if (slot.status !== 'AVAILABLE') {

      //   throw new BadRequestException('Slot is not available')
      // }

      // if (slot.schedule_id !== schedule.id) {
      //   throw new BadRequestException('Slot does not belong to the selected schedule');
      // }

      if (schedule.service_id !== service.id) {
        throw new BadRequestException('Schedule does not belong to the selected service');
      }


      // if (new Date(slot.date) < new Date()) {
      //   throw new BadRequestException('Cannot book past time slots');
      // }

      const appointment = await this.prisma.appointment.create({
        data: {
          user_id: userId,
          service_id: data.serviceId,
          schedule_id: data.scheduleId,
          slot_id: slot.id,
          paymentMethod: data.paymentMethod || 'UNPAID',
          paymentDetails: data.paymentDetails || {},
          personalInfo: data.personalInfo || {},
          questionAnswers: data.questionAnswers || [],
          status: 'PENDING',
          type: "SUBSCRIPTION",
        },
        include: {
          user: true,
          service: true,
          schedule: true,
          slot: true,
        },
      });

      // await this.prisma.slot.update({
      //   where: { id: data.slotId },
      //   data: { status: 'PENDING' },
      // });

      return appointment;

    }
    catch (err) {
      throw err;

    }


  }






  async createPaymentIntentSubcription(
    {
      userId,
      createPaymentIntentDto,
    }: {
      userId: string;
      createPaymentIntentDto: CreatePaymentIntentDto;
    }
  ) {
    const { amount, currency, appointmentId } = createPaymentIntentDto;
    const STRIPE_SECRET_KEY = appConfig().payment.stripe.secret_key;
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-01-27.acacia',
    });  
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId }, 
      include: {
        //user: true,
        service: true,
        // schedule: true,
        // slot: true,
      },
      });
    console.log(appointment, "appointmentsdfwefffcfffccfdcc");
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency,
      metadata: {
        userId,
        appointmentId,
      },
      payment_method_types: ['card'],
    });

    await this.prisma.transaction.create({
      data: {
        amount,
        type: 'SUBSCRIPTION',
        status: 'PENDING',
        currency,
        //getuserId : appointment?.user_id,
        getuser : { connect: { id: appointment?.service?.user_id } },
        description: `Payment for Subscription ${appointmentId}`,
        // wallet: {
        //   connect: { userId },
        // },
        user: { connect: { id: userId } },
        appointment: { connect: { id: appointmentId } },
        stripePaymentId: paymentIntent.id,
      },
    });

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }







  findAll() {
    return `This action returns all appointment`;
  }

  findOne(id: string) {
    return `This action returns a #${id} appointment`;
  }

  update(id: number, updateAppointmentDto: UpdateAppointmentDto) {
    return `This action updates a #${id} appointment`;
  }

  remove(id: number) {
    return `This action removes a #${id} appointment`;
  }

}



