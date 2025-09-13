import { Module } from '@nestjs/common';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminDashboardController } from './admin-dashboard.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppointmentService } from '../appointment/appointment.service';

@Module({
  controllers: [AdminDashboardController],
  providers: [AdminDashboardService,PrismaService, AppointmentService],
})
export class AdminDashboardModule {}
