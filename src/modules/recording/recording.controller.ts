import { Controller, Get, Delete, Param, Req, UseGuards } from '@nestjs/common';
import { RecordingService } from './recording.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@Controller('recordings')
@UseGuards(JwtAuthGuard)
export class RecordingController {
  constructor(private readonly recordingService: RecordingService) {}

  @Get('my-recordings')
  async getMyRecordings(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      console.log(user_id);
      return await this.recordingService.getRecordingsByUser(user_id);
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch recordings',
      };
    }
  }

  @Get('appointment/:appointmentId')
  async getRecordingsByAppointment(@Param('appointmentId') appointmentId: string) {
    return this.recordingService.getRecordingsByAppointment(appointmentId);
  }

  @Delete(':id')
  async deleteRecording(@Param('id') id: string) {
    return this.recordingService.deleteRecording(id);
  }
}
