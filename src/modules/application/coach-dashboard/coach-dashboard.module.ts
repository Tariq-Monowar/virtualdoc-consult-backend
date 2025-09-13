import { Module } from '@nestjs/common';
import { CoachDashboardService } from './coach-dashboard.service';
import { CoachDashboardController } from './coach-dashboard.controller';
import { AppointmentService } from '../appointment/appointment.service';
import { AppointmentModule } from '../appointment/appointment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [AppointmentModule, NotificationModule],
  controllers: [CoachDashboardController],
  providers: [CoachDashboardService, AppointmentService],
})
export class CoachDashboardModule { }
