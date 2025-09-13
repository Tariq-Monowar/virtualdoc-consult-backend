import { Controller, Post, Req, Headers } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { Stripe } from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { ConversationService } from '../../chat/conversation/conversation.service'; // Add this import

@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
  ) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    try {
      const payload = req.rawBody.toString();
      const event = await this.stripeService.handleWebhook(payload, signature);

      // Handle events
      // switch (event.type) {
      //   case 'customer.created':
      //     break;
      //   case 'payment_intent.created':
      //     break;
      //   case 'payment_intent.succeeded':
      //     const paymentIntent = event.data.object;
      //     // create tax transaction
      //     // await StripePayment.createTaxTransaction(
      //     //   paymentIntent.metadata['tax_calculation'],
      //     // );
      //     // Update transaction status in database
      //     await TransactionRepository.updateTransaction({
      //       reference_number: paymentIntent.id,
      //       status: 'succeeded',
      //       paid_amount: paymentIntent.amount / 100, // amount in dollars
      //       paid_currency: paymentIntent.currency,
      //       raw_status: paymentIntent.status,
      //     });
      //     break;
      //   case 'payment_intent.payment_failed':
      //     const failedPaymentIntent = event.data.object;
      //     // Update transaction status in database
      //     await TransactionRepository.updateTransaction({
      //       reference_number: failedPaymentIntent.id,
      //       status: 'failed',
      //       raw_status: failedPaymentIntent.status,
      //     });
      //   case 'payment_intent.canceled':
      //     const canceledPaymentIntent = event.data.object;
      //     // Update transaction status in database
      //     await TransactionRepository.updateTransaction({
      //       reference_number: canceledPaymentIntent.id,
      //       status: 'canceled',
      //       raw_status: canceledPaymentIntent.status,
      //     });
      //     break;
      //   case 'payment_intent.requires_action':
      //     const requireActionPaymentIntent = event.data.object;
      //     // Update transaction status in database
      //     await TransactionRepository.updateTransaction({
      //       reference_number: requireActionPaymentIntent.id,
      //       status: 'requires_action',
      //       raw_status: requireActionPaymentIntent.status,
      //     });
      //     break;
      // case 'payout.paid':
      //   const paidPayout = event.data.object;
      //   console.log(paidPayout);
      //   break;
      //   case 'payout.failed':
      //     const failedPayout = event.data.object;
      //     console.log(failedPayout);
      //     break;
      //   default:
      //     console.log(`Unhandled event type ${event.type}`);
      // }

      // return { received: true };
      // ---------------------------------------------------------------
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as any);
          break;
        case 'payment_intent.payment_failed':
          //await this.handlePaymentIntentFailed(event.data.object as any);
          break;
        case 'charge.refunded':
          //await this.handleChargeRefunded(event.data.object as any);
          break;
        case 'payout.paid':
          await this.handlePayoutPaid(event.data.object as any);
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
          console.log('Full event:', JSON.stringify(event, null, 2));
          break;
      }

      return { received: true };
      // ---------------------------------------------------------------
    } catch (error) {
      console.error('Webhook error', error);
      return { received: false };
    }
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const { id, amount, currency, metadata } = paymentIntent;
    const amountInDollars = amount / 100;

    // Update transaction status
    await this.prisma.transaction.update({
      where: { stripePaymentId: id },
      data: {
        status: 'COMPLETED',
      },
    });

    // Create work order for the session
    // if (metadata.appointmentId) {
    //   // const appointment = await this.prisma.appointment.findUnique({
    //   //   where: { id: metadata.appointmentId },
    //   //   include: { slot: true },
    //   // });

    //   this.prisma.appointment.update(
    //     {
    //     where: { id: metadata.appointmentId },
    //     data: {
    //       status: 'CONFIRMED',
    //       paymentMethod: 'PAID' // Assuming you want to update this too
    //     }
    //   }
    // );

    // this.prisma.slot.update({
    //   where: {
    //     id: appointment.slot_id // This comes from your included slot
    //   },
    //   data: {
    //     status: 'CONFIRMED',
    //     is_booked: true
    //   }
    // })

    // }

    if (metadata.appointmentId) {
      // First get the appointment with its slot
      const appointment = await this.prisma.appointment.findUnique({
        where: { id: metadata.appointmentId },
        include: {
          slot: true,
          transaction: true,
          user: true,
          service: {
            include: {
              user: true,
            }
          }
        },
      });

      if (appointment && appointment?.transaction[0]?.type === 'PAYMENT') {
        if (appointment && appointment.slot) {
          await this.prisma.$transaction([
            this.prisma.appointment.update({
              where: { id: metadata.appointmentId },
              data: {
                status: 'CONFIRMED',
                paymentMethod: 'PAID',
              },
            }),

            this.prisma.slot.update({
              where: { id: appointment.slot.id },
              data: {
                status: 'CONFIRMED',
                is_booked: true,
              },
            }),
          ]);
        }

        // 3) Now trigger conversation creation
        await this.conversationService.create({
          creator_id: appointment.user_id, // Jane’s userId
          participant_id: appointment.service.user_id, // Dr. Smith’s userId
          appointment_id: appointment.id,
        });

      } else if (
        appointment &&
        appointment?.transaction[0]?.type === 'SUBSCRIPTION'
      ) {
        await this.prisma.$transaction([
          this.prisma.appointment.update({
            where: { id: metadata.appointmentId },
            data: {
              status: 'CONFIRMED',
              paymentMethod: 'PAID',
            },
          }),
        ]);

        await this.prisma.subscription.create({
          data: {
            customerId: appointment?.user?.billing_id,
            userId: metadata?.userId,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            appointmentId: metadata?.appointmentId,
            status: 'ACTIVE',
            paymentIntentId: paymentIntent.id,
            updatedAt: new Date(),
          },
        });

        // 3) Now trigger conversation creation
        await this.conversationService.create({
          creator_id: appointment.user_id, // Jane’s userId
          participant_id: appointment.service.user_id, // Dr. Smith’s userId
          appointment_id: appointment.id,
        });
      }

      // if (appointment) {
      //   const adminFee = amountInDollars * 0.2; // 20% fee
      //   const coachEarning = amountInDollars * 0.8; // 80% to coach

      //   // await this.prisma.workOrder.create({
      //   //   data: {
      //   //     sessionId: metadata.sessionId,
      //   //     adminFee,
      //   //     coachEarning,
      //   //   },
      //   // });
      // }
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    await this.prisma.transaction.update({
      where: { stripePaymentId: paymentIntent.id },
      data: {
        status: 'FAILED',
      },
    });
  }

  // private async handleChargeRefunded(charge: Stripe.Charge) {
  //   const paymentIntentId = charge.payment_intent as string;
  //   const refund = charge.refunds.data[0];

  //   if (!refund) return;

  //   // Find the original transaction
  //   const transaction = await this.prisma.transaction.findFirst({
  //     where: { stripePaymentId: paymentIntentId },
  //   });

  //   if (!transaction) return;

  //   // Create refund record
  //   await this.prisma.refund.update({
  //     where: { sessionId: transaction.sessionId },
  //     data: {
  //       status: 'PROCESSED',
  //       processedAt: new Date(),
  //       stripeRefundId: refund.id,
  //     },
  //   });

  //   // Create refund transaction
  //   await this.prisma.transaction.create({
  //     data: {
  //       amount: refund.amount / 100,
  //       type: 'REFUND',
  //       status: 'COMPLETED',
  //       currency: refund.currency,
  //       description: `Refund for payment ${paymentIntentId}`,
  //       walletId: transaction.walletId,
  //       userId: transaction.userId,
  //       sessionId: transaction.sessionId,
  //       refundId: transaction.sessionId, // Assuming refund is linked to session
  //       stripePaymentId: refund.id,
  //     },
  //   });
  // }

  private async handlePayoutPaid(payout: Stripe.Payout) {
    //
    const metadata = payout.metadata;
    const userId = metadata?.user_id;
    const account_id = metadata?.account_id;
    const transectionId = metadata?.transaction_id;

    if (transectionId) {
      const transaction = await this.prisma.transaction.update({
        where: {
          id: transectionId,
        },
        data: {
          status: 'COMPLETED',
        },
      });

      if (userId) {
        await this.prisma.wallet.create({
          data: {
            userId: userId,
            //appointment_id: appointmentId,
            balance: transaction?.amount,
            currency: 'usd',
            type: 'WITHDRAWAL',
            updatedAt: new Date(),
          },
        });
      }
    }

    console.log(payout, 'payout');
  }

  // async processCoachWithdrawal(withdrawalId: string) {
  //   const withdrawal = await this.prisma.withdrawal.findUnique({
  //     where: { id: withdrawalId },
  //     include: { coach: true, wallet: true },
  //   });

  //   if (!withdrawal || withdrawal.status !== 'PENDING') {
  //     throw new Error('Invalid withdrawal request');
  //   }

  //   if (withdrawal.wallet.balance < withdrawal.amount) {
  //     throw new Error('Insufficient balance');
  //   }

  //   // Create payout with Stripe
  //   const payout = await this.stripe.payouts.create({
  //     amount: Math.round(withdrawal.amount * 100),
  //     currency: 'usd',
  //     metadata: {
  //       withdrawalId,
  //       coachId: withdrawal.coachId,
  //     },
  //     method: 'standard',
  //   });

  //   // Update withdrawal record
  //   await this.prisma.withdrawal.update({
  //     where: { id: withdrawalId },
  //     data: {
  //       stripePayoutId: payout.id,
  //     },
  //   });

  //   // Create transaction record
  //   await this.prisma.transaction.create({
  //     data: {
  //       amount: withdrawal.amount,
  //       type: 'WITHDRAWAL',
  //       status: 'PENDING',
  //       currency: 'USD',
  //       description: `Withdrawal to bank account`,
  //       walletId: withdrawal.walletId,
  //       coachId: withdrawal.coachId,
  //     },
  //   });

  //   return payout;
  // }

  // async completeSessionPayment(sessionId: string) {
  //   const session = await this.prisma.session.findUnique({
  //     where: { id: sessionId },
  //     include: { workOrder: true, coach: { include: { wallet: true } } },
  //   });

  //   if (!session || !session.workOrder || session.workOrder.isPaid) {
  //     throw new Error('Invalid session or already paid');
  //   }

  //   // Update work order as paid
  //   await this.prisma.workOrder.update({
  //     where: { sessionId },
  //     data: {
  //       isPaid: true,
  //       paidAt: new Date(),
  //     },
  //   });

  //   // Update coach's wallet balance
  //   await this.prisma.wallet.update({
  //     where: { coachId: session.coachId },
  //     data: {
  //       balance: {
  //         increment: session.workOrder.coachEarning,
  //       },
  //     },
  //   });

  //   // Create transaction for coach earnings
  //   await this.prisma.transaction.create({
  //     data: {
  //       amount: session.workOrder.coachEarning,
  //       type: 'TRANSFER',
  //       status: 'COMPLETED',
  //       currency: 'USD',
  //       description: `Earnings from session ${sessionId}`,
  //       walletId: session.coach.wallet.id,
  //       coachId: session.coachId,
  //       sessionId,
  //     },
  //   });

  //   return true;
  // }
}
