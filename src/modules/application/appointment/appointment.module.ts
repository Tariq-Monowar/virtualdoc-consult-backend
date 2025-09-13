import { Module } from '@nestjs/common';
import { AppointmentService } from './appointment.service';
import { AppointmentController } from './appointment.controller';
import { BullModule } from '@nestjs/bullmq';
import { AppointmentProcessor } from './processors/appointment.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'appointment-queue', // must match the queue name you're injecting
    }),
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService, AppointmentProcessor],
})
export class AppointmentModule { }
