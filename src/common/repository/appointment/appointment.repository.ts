import { PrismaClient } from '@prisma/client';
import { DateHelper } from '../../helper/date.helper';

const prisma = new PrismaClient();

export class AppointmentRepository {
  /**
   * Validate if a call can be made for a specific appointment
   * @param appointmentId - The ID of the appointment
   * @param userId - The ID of the user trying to make the call
   * @returns Object with validation result and message
   */
  // Add these methods to your existing AppointmentRepository class

  static async validateDoctorCallAccess(
    appointmentId: string,
    doctorId: string,
  ) {
    try {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
        },
        include: {
          service: {
            include: {
              user: true,
            },
          },
          schedule: true,
          slot: true,
          user: true,
        },
      });

      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
        };
      }

      // Check if the user is the doctor for this appointment
      if (appointment.service.user_id !== doctorId) {
        return {
          success: false,
          message: 'You are not the doctor for this appointment',
        };
      }

      // Check if appointment is confirmed
      if (appointment.status !== 'CONFIRMED') {
        return {
          success: false,
          message: 'This appointment is not confirmed',
        };
      }

      // Check if appointment is within valid time window
      const isWithinTimeWindow =
        this.isWithinAppointmentTimeWindow(appointment);
      if (!isWithinTimeWindow.success) {
        return isWithinTimeWindow;
      }

      return {
        success: true,
        message: 'Doctor is authorized to call',
        appointment,
      };
    } catch (error) {
      console.error('Error validating doctor call access:', error);
      return {
        success: false,
        message: 'Error validating call access',
      };
    }
  }

  static async validatePatientCallbackAccess(
    appointmentId: string,
    patientId: string,
  ) {
    try {
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
        },
        include: {
          service: {
            include: {
              user: true,
            },
          },
          schedule: true,
          slot: true,
          user: true,
        },
      });

      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
        };
      }

      // Check if the user is the patient for this appointment
      if (appointment.user_id !== patientId) {
        return {
          success: false,
          message: 'You are not the patient for this appointment',
        };
      }

      // Check if appointment is confirmed
      if (appointment.status !== 'CONFIRMED') {
        return {
          success: false,
          message: 'This appointment is not confirmed',
        };
      }

      // Check if appointment is within valid time window
      const isWithinTimeWindow =
        this.isWithinAppointmentTimeWindow(appointment);
      if (!isWithinTimeWindow.success) {
        return isWithinTimeWindow;
      }

      // Check if there's a missed call record
      const missedCall = await prisma.missedCall.findFirst({
        where: {
          appointment_id: appointmentId,
          patient_id: patientId,
          callback_used: false,
        },
      });

      if (!missedCall) {
        return {
          success: false,
          message:
            'You can only call back if you missed a call from the doctor',
        };
      }

      return {
        success: true,
        message: 'Patient is authorized to call back',
        appointment,
        missedCallId: missedCall.id,
      };
    } catch (error) {
      console.error('Error validating patient callback access:', error);
      return {
        success: false,
        message: 'Error validating call access',
      };
    }
  }

  static isWithinAppointmentTimeWindow(appointment) {
    const now = new Date();

    // Get appointment date from schedule
    const appointmentDate = new Date(appointment.schedule.date);

    // Get start and end times from slot
    const [startHour, startMinute] = appointment.slot.start_time
      .split(':')
      .map(Number);
    const [endHour, endMinute] = appointment.slot.end_time
      .split(':')
      .map(Number);

    // Set appointment start and end times
    const appointmentStart = new Date(appointmentDate);
    appointmentStart.setHours(startHour, startMinute, 0, 0);

    const appointmentEnd = new Date(appointmentDate);
    appointmentEnd.setHours(endHour, endMinute, 0, 0);

    // Add a buffer (15 minutes before and after)
    const bufferStart = new Date(appointmentStart);
    bufferStart.setMinutes(appointmentStart.getMinutes() - 15);

    const bufferEnd = new Date(appointmentEnd);
    bufferEnd.setMinutes(appointmentEnd.getMinutes() + 15);
    // TODO: changed appointment check to true for testing
    if (now < bufferStart) {
      return {
        success: true,
        message: `Your appointment hasn't started yet. It will start at ${appointmentStart.toLocaleTimeString()}`,
        startTime: appointmentStart,
        appointment: null // Add this to maintain consistent structure
      };
    }

    if (now > bufferEnd) {
      return {
        success: true,
        message: 'Your appointment time has ended',
        startTime: undefined, // Add this to maintain consistent structure
        appointment: null // Add this to maintain consistent structure
      };
    }

    return {
      success: true,
      message: 'Within appointment time window',
      startTime: appointmentStart, // Add this to maintain consistent structure
      appointment: appointment // Pass the appointment object
    };
  }

  static async getAppointmentWithUsers(appointmentId: string) {
    return await prisma.appointment.findFirst({
      where: {
        id: appointmentId,
      },
      include: {
        service: {
          include: {
            user: true,
          },
        },
        user: true,
      },
    });
  }

  /**
   * General validation for call access - works for both doctors and patients
   * @param appointmentId - The ID of the appointment
   * @param userId - The ID of the user trying to access the call
   * @returns Object with validation result and message
   */
  static async validateCallAccess(
    appointmentId: string,
    userId: string,
  ) {
    try {

      if (!appointmentId || !userId) {
        return {
          success: false,
          message: 'Appointment ID or User ID is missing',
        };
      }
      console.log("appointmentId: ", appointmentId)
      const appointment = await prisma.appointment.findFirst({
        where: {
          id: appointmentId,
        },
        include: {
          service: {
            include: {
              user: true,
            },
          },
          schedule: true,
          slot: true,
          user: true,
        },
      });

      if (!appointment) {
        return {
          success: false,
          message: 'Appointment not found',
          startTime: undefined,
          appointment: null
        };
      }

      // Check if the user is either the doctor or the patient for this appointment
      const isDoctor = appointment.service.user_id === userId;
      const isPatient = appointment.user_id === userId;

      if (!isDoctor && !isPatient) {
        return {
          success: false,
          message: 'You are not authorized for this appointment',
          startTime: undefined,
          appointment: null
        };
      }

      // Check if appointment is confirmed
      if (appointment.status !== 'CONFIRMED') {
        return {
          success: false,
          message: 'This appointment is not confirmed',
          startTime: undefined,
          appointment: null
        };
      }

      // Check if appointment is within valid time window
      const isWithinTimeWindow = this.isWithinAppointmentTimeWindow(appointment);
      if (!isWithinTimeWindow.success) {
        return isWithinTimeWindow; // This now has consistent structure
      }

      return {
        success: true,
        message: 'User is authorized to access the call',
        appointment: appointment,
        startTime: isWithinTimeWindow.startTime,
      };
    } catch (error) {
      console.error('Error validating call access:', error);
      return {
        success: false,
        message: 'Error validating call access',
        startTime: undefined,
        appointment: null
      };
    }
  }
}