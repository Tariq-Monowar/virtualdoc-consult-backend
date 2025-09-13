import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { use } from 'passport';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { stat } from 'fs';

@Injectable()

export class RefundService {


  constructor(private readonly prisma: PrismaService) { }



  create(createRefundDto: CreateRefundDto) {
    return 'This action adds a new refund';
  }

  findAll() {
    return `This action returns all refund`;
  }

  findOne(id: number) {
    return `This action returns a #${id} refund`;
  }

  update(id: number, updateRefundDto: UpdateRefundDto) {
    return `This action updates a #${id} refund`;
  }

  remove(id: number) {
    return `This action removes a #${id} refund`;
  }


  // async refundmoneyWithPayOut(userId: string, account_id: string, appointmentId: string) {
  //   try {
  //     const user = await this.prisma.user.findUnique({
  //       where: { id: userId }
  //     });
  //     if (!user) {
  //       throw new NotFoundException('User not found');
  //     }
  //     if (user.banking_id !== account_id) {
  //       throw new NotFoundException('Account not found');
  //     }

  //     const appointment = await this.prisma.appointment.findUnique({
  //       where: { id: appointmentId },
  //       include: {
  //         service: true,
  //         slot: true,
  //       }
  //     });
  //     if (!appointment) {
  //       throw new NotFoundException('Appointment not found');
  //     }
  //     const now = new Date();
  //     const appointmentDate = new Date(appointment?.slot?.date);
  //     // Calculate the cutoff time (current time + 48 hours)
  //     const refundCutoffTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  //     if (appointmentDate < refundCutoffTime) {
  //       throw new NotFoundException(
  //         appointmentDate < now
  //           ? 'Appointment date has already passed'
  //           : 'Cancellations/refunds not allowed within 48 hours of appointment'
  //       );
  //     }
      
  //        const transaction = await this.prisma.transaction.create({
  //       data: {
  //         userId: userId,
  //         appointment_id: appointmentId,
  //         amount: appointment?.service?.price,
  //         currency: "usd",
  //         status: "REFUNDED",
  //         type: "REFUND",
         
  //       },
  //     });




  //     const metadata = {
  //       appointment_id: appointmentId,
  //       user_id: userId,
  //       account_id: account_id,
  //       transaction_id: transaction.id,

  //     }

  //      const response = await StripePayment.createPayout(account_id, appointment?.service?.price, "usd", metadata);


  //     //  await this.prisma.appointment.update({
  //     //   where: { id: appointmentId },
  //     //   data: {
  //     //     status: "CANCELLED",
  //     //     //refund_status: "REFUNDED",
  //     //     //refund_amount: appointment?.service?.price,
  //     //     //refund_date: new Date(),
  //     //   }
  //     // });
 
  //     return response;

  //   } catch (error) {
  //     throw error;
  //   }
  // }



  async refundmoneyToWallet(userId: string,  appointmentId: string) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      

      const appointment = await this.prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: true,
          slot: true,
        }
      });
      if (!appointment) {
        throw new NotFoundException('Appointment not found');
      }
      const now = new Date();
      const appointmentDate = new Date(appointment?.slot?.date);
      // Calculate the cutoff time (current time + 48 hours)
      const refundCutoffTime = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      if (appointmentDate < refundCutoffTime) {
        throw new NotFoundException(
          appointmentDate < now
            ? 'Appointment date has already passed'
            : 'Cancellations/refunds not allowed within 48 hours of appointment'
        );
      }
      if (appointment.status === "CANCELLED") {
        throw new NotFoundException('Appointment already cancelled');
      }


      await this.prisma.appointment.update({
        where: { id: appointmentId },
        data: {
          status: "CANCELLED",
          
        }
      });
      

      await this.prisma.wallet.create({
        data: {
          userId: userId,
          appointment_id: appointmentId,
          balance: appointment?.service?.price,
          currency: "usd",
          type: "REFUND",
          updatedAt: new Date(),
        },
      });
      await this.prisma.transaction.create({
        data:{
          userId :userId,
          getuserId : appointment?.service?.user_id,
          amount : appointment?.service?.price,
          type : "REFUND",
          appointment_id: appointmentId,
          status: "COMPLETED"
        }
      })
      return {
        status: 200,
        success: true,
        message: "Refunded successfully",
      };

    } catch (error) {
      throw error;
    }
  }
}
