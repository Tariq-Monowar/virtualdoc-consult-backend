import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import { RecordingStatus } from '@prisma/client';
import { Request } from 'express';

@Injectable()
export class RecordingService {
  private readonly logger = new Logger(RecordingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRecordingsByAppointment(appointmentId: string) {
    return this.prisma.recording.findMany({
      where: { appointment_id: appointmentId },
      orderBy: { created_at: 'desc' },
    });
  }

  async getRecordingsByUser(userId: string) {
    // Changed from (req: Request)
    const recordings = await this.prisma.recording.findMany({
      where: {
        appointment: {
          OR: [
            { user_id: userId }, // As patient
            { service: { user_id: userId } }, // As coach
          ],
        },
        status: RecordingStatus.COMPLETED,
      },
      orderBy: {
        updated_at: 'desc', // Order by recording's update time
      },
      include: {
        appointment: {
          include: {
            service: true,
          },
        },
      },
    });

    // Transform recordings to include updated_at instead of appointment date
    return recordings.map((recording) => ({
      id: recording.id,
      file_url: SojebStorage.url(
        `/recordings/${recording.appointment_id}/${recording.file_url}`,
      ),
      duration: recording.duration,
      created_at: recording.created_at,
      updated_at: recording.updated_at,
      appointment_id: recording.appointment_id,
      service_name: recording.appointment?.service?.category || '',
    }));
  }

  async deleteRecording(id: string) {
    return this.prisma.recording.delete({
      where: { id },
    });
  }

  async startRecording(appointmentId: string, callId: string) {
    try {
      // Check for existing active recording
      const existingRecording = await this.prisma.recording.findFirst({
        where: {
          appointment_id: appointmentId,
          status: RecordingStatus.PROCESSING,
        },
      });

      if (existingRecording) {
        throw new Error('Active recording already exists');
      }

      const recording = await this.prisma.recording.create({
        data: {
          appointment_id: appointmentId,
          file_url: 'null',
          status: RecordingStatus.PROCESSING,
          duration: 0,
        },
      });

      return {
        success: true,
        message: 'Recording started successfully',
        data: recording,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to start recording',
        error: error.message,
      };
    }
  }

  async stopRecording(appointmentId: string, filePath: string) {
    console.log('filePath', filePath, 'appointmentId', appointmentId, 'callId');
    try {
      const recording = await this.prisma.recording.findFirst({
        where: {
          appointment_id: appointmentId,
          status: RecordingStatus.PROCESSING,
        },
      });

      if (!recording) {
        throw new Error('No active recording found');
      }

      await this.prisma.recording.update({
        where: { id: recording.id },
        data: {
          status: RecordingStatus.COMPLETED,
          file_url: filePath,
          duration: Math.floor(
            (Date.now() - recording.created_at.getTime()) / 1000,
          ),
        },
      });

      return {
        success: true,
        message: 'Recording stopped successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to stop recording',
        error: error.message,
      };
    }
  }

  public async validateParticipant(userId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        user: true,
        service: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    if (
      appointment.user_id !== userId &&
      appointment.service.user_id !== userId
    ) {
      throw new UnauthorizedException(
        'User not authorized for this appointment',
      );
    }

    return appointment;
  }
}
