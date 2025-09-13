import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class MissedCallRepository {
  static async createMissedCall(appointmentId: string, doctorId: string, patientId: string) {
    return await prisma.missedCall.create({
      data: {
        appointment_id: appointmentId,
        doctor_id: doctorId,
        patient_id: patientId
      }
    });
  }

  static async getMissedCall(appointmentId: string, patientId: string) {
    // Get the missed call without trying to include the appointment relation
    return await prisma.missedCall.findFirst({
      where: {
        appointment_id: appointmentId,
        patient_id: patientId,
        callback_used: false
      }
    });
  }

  // Add a method to get appointment details separately if needed
  static async getAppointmentDetails(appointmentId: string) {
    return await prisma.appointment.findUnique({
      where: {
        id: appointmentId
      },
      include: {
        schedule: true,
        slot: true
      }
    });
  }

  static async markCallbackUsed(missedCallId: string) {
    return await prisma.missedCall.update({
      where: {
        id: missedCallId
      },
      data: {
        callback_used: true,
        callback_at: new Date()
      }
    });
  }
}