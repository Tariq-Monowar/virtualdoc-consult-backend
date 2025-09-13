import { Module } from '@nestjs/common';
import { UserDashboardService } from './user-dashboard.service';
import { UserDashboardController } from './user-dashboard.controller';
import { AppointmentModule } from '../appointment/appointment.module';
import { AppointmentService } from '../appointment/appointment.service';

@Module({
  imports: [AppointmentModule],
  controllers: [UserDashboardController],
  providers: [UserDashboardService, AppointmentService],
})
export class UserDashboardModule {}
