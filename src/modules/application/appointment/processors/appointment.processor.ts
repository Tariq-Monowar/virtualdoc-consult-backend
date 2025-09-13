// import { Processor, Process } from '@nestjs/bull';
// import { Job } from 'bull';
// import { AppointmentService } from '../appointment.service';

// @Processor('appointment')
// export class AppointmentProcessor {
//   constructor(private readonly appointmentService: AppointmentService) { }

//   @Process('appointment-slot-check')
//   async handleCheckAppointment(job: Job) {
//     const { userId, appointmentId, slotId } = job.data;
//     console.log(`Processing appointment check for user: ${userId}, appointment: ${appointmentId}, slot: ${slotId}`);
//     console.log('Running delayed appointment check...');
//     // await this.appointmentService.appointmentCheck({ userId, appointmentId, slotId });
//   }
// }

import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AppointmentService } from '../appointment.service';

@Processor('appointment-queue')
export class AppointmentProcessor extends WorkerHost {
  private readonly logger = new Logger(AppointmentProcessor.name);
  constructor(private readonly appointmentService: AppointmentService) {
    super();
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    console.log(
      `Processing job ${job.id} of type ${job.name} with data ${job.data}...`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job, result: any) {
    this.logger.log(`Job ${job.id} with name ${job.name} completed`);
  }

  async process(job: Job): Promise<any> {
    this.logger.log(`Processing job ${job.id} with name ${job.name}`);
    try {
      switch (job.name) {
        case 'appointment-slot-check':
          this.logger.log('appointment-slot-check');
          const { user_id, id, slotId } = job.data;
          await this.appointmentService.appointmentCheck({
            userId: user_id,
            appointmentId: id,
            slotId
          });
          break;

        default:
          this.logger.log('Unknown job name');
          return;
      }
    } catch (error) {
      this.logger.error(
        `Error processing job ${job.id} with name ${job.name}`,
        error,
      );
      throw error;
    }
  }
}
