import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDashboardDto } from './dto/create-user-dashboard.dto';
import { UpdateUserDashboardDto } from './dto/update-user-dashboard.dto';
import { AppointmentService } from '../appointment/appointment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Appointment, Prisma } from '@prisma/client';
import { stat } from 'fs';

@Injectable()
export class UserDashboardService {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly prisma: PrismaService,
  ) {}

  // async findAllHiredCoach(
  //     userId: string,
  //     category?: string // Add optional category parameter
  // ): Promise<{ coachesList: any[]; appointmentsDate: any[] }> {
  //     if (!userId || typeof userId !== 'string' || userId.trim() === '') {
  //         throw new Error('Invalid user ID');
  //     }

  //     try {
  //         // console.log(category, 'category')
  //         const appointments = await this.prisma.appointment.findMany({
  //             where: {
  //                 user_id: userId,
  //                 status: 'CONFIRMED'
  //             },
  //             include: {
  //                 service: {
  //                     include: {
  //                         user: {
  //                             include: {
  //                                 user_documents: true,
  //                                 accounts: true,
  //                                 roles: true,
  //                             }
  //                         }
  //                     }
  //                 },
  //                 schedule: true,
  //                 slot: true
  //             },
  //             orderBy: {
  //                 created_at: 'desc',
  //             },
  //         });
  //         console.log(appointments, 'appointments')
  //         if (!appointments || appointments.length === 0) {
  //             throw new NotFoundException('No appointments found for this user');
  //         }

  //         const coachMap = new Map<string, any>();
  //         let appointmentsDate = [];

  //         for (const appointment of appointments) {
  //             const coachId = appointment.service.user_id;
  //             const coachDetails = appointment.service.user;
  //             const coach = await this.prisma.user.findUnique({
  //                 where: { id: coachId },
  //             });

  //             appointmentsDate.push(appointment.slot.date);

  //             if (!coachMap.has(coachId)) {
  //                 // console.log('coachId', coachId)
  //                 // console.log('appointment', appointment)
  //                 coachMap.set(coachId, {
  //                     orderId: appointment.id,
  //                     coachId: coachId,
  //                     name: coachDetails.name || appointment.service.service_provider_name,
  //                     email: coachDetails.email,
  //                     status: appointment.status,
  //                     hiredDate: this.formatHiredDate(appointment.created_at),
  //                     category: appointment.service.category,
  //                     totalAppointments: 1,
  //                     lastAppointmentDate: appointment.slot.date,
  //                     appointmentDate: appointment.slot.date,
  //                     appointmentTime: appointment.slot.start_time,
  //                     avater: coach.avatar,
  //                     services: [{
  //                         serviceId: appointment.service.id,
  //                         serviceName: appointment.service.descriptions,
  //                         price: appointment.service.price
  //                     }],
  //                     timeleft: this.getAvailableTime(appointment.slot.date, appointment.slot.start_time),
  //                     schedule: appointment.schedule,
  //                     slot: appointment.slot,
  //                 });
  //             } else {
  //                 const existingCoach = coachMap.get(coachId);
  //                 existingCoach.totalAppointments += 1;

  //                 if (new Date(appointment.slot.date) > new Date(existingCoach.lastAppointmentDate)) {
  //                     existingCoach.lastAppointmentDate = appointment.slot.date;
  //                 }

  //                 const serviceExists = existingCoach.services.some(
  //                     (s: any) => s.serviceId === appointment.service.id
  //                 );
  //                 if (!serviceExists) {
  //                     existingCoach.services.push({
  //                         serviceId: appointment.service.id,
  //                         serviceName: appointment.service.descriptions,
  //                         price: appointment.service.price
  //                     });
  //                 }
  //             }
  //         }

  //         let coachesList = Array.from(coachMap.values());

  //         // Filter by category if provided
  //         if (category) {
  //             coachesList = coachesList.filter(coach =>
  //                 coach.category.toLowerCase() === category.toLowerCase()
  //             );
  //         }

  //         coachesList.sort((a, b) =>
  //             new Date(b.lastAppointmentDate).getTime() - new Date(a.lastAppointmentDate).getTime()
  //         );
  //        console.log('coachesList', coachesList)
  //         return { coachesList, appointmentsDate };
  //     } catch (error) {
  //         if (error instanceof NotFoundException) {
  //             throw error;
  //         }
  //         console.error('Error in findAllHiredCoach:', error);
  //         throw new Error('Failed to fetch coaches list');
  //     }
  // }

  // async findAllHiredCoach(userId: string, category?: string): Promise<any[]> {
  //     if (!userId || typeof userId !== 'string' || userId.trim() === '') {
  //         throw new Error('Invalid user ID');
  //     }

  //     try {
  //         const appointments = await this.prisma.appointment.findMany({
  //             where: {
  //                 user_id: userId,
  //                 status: 'CONFIRMED',
  //             },
  //             include: {
  //                 service: {
  //                     include: {
  //                         user: {
  //                             include: {
  //                                 user_documents: true,
  //                                 accounts: true,
  //                                 roles: true,
  //                             }
  //                         }
  //                     }
  //                 },
  //                 schedule: true,
  //                 slot: true
  //             },
  //             orderBy: {
  //                 created_at: 'desc',
  //             },
  //         });

  //         if (!appointments || appointments.length === 0) {
  //             throw new NotFoundException('No appointments found for this user');
  //         }

  //         const coachMap = new Map<string, any>();

  //         for (const appointment of appointments) {
  //             const coachId = appointment.service.user_id;
  //             const coachDetails = appointment.service.user;

  //             // 🔍 Filter by category if provided
  //             if (category && appointment.service.category !== category) {
  //                 continue;
  //             }

  //             const coach = await this.prisma.user.findUnique({
  //                 where: { id: coachId },
  //             });

  //             if (!coachMap.has(coachId)) {
  //                 coachMap.set(coachId, {
  //                     coachId: coachId,
  //                     name: coachDetails.name || appointment.service.service_provider_name,
  //                     email: coachDetails.email,
  //                     hiredDate: this.formatHiredDate(appointment.created_at),
  //                     category: appointment.service.category,
  //                     totalAppointments: 1,
  //                     lastAppointmentDate: appointment.slot.date,
  //                     avater: coach.avatar,
  //                     services: [{
  //                         serviceId: appointment.service.id,
  //                         serviceName: appointment.service.descriptions,
  //                         price: appointment.service.price
  //                     }],
  //                     timeleft: this.getAvailableTime(appointment.slot.date, appointment.slot.start_time),
  //                     schedule: appointment.schedule,
  //                     slot: appointment.slot,
  //                 });
  //             } else {
  //                 const existingCoach = coachMap.get(coachId);
  //                 existingCoach.totalAppointments += 1;

  //                 if (new Date(appointment.slot.date) > new Date(existingCoach.lastAppointmentDate)) {
  //                     existingCoach.lastAppointmentDate = appointment.slot.date;
  //                 }

  //                 const serviceExists = existingCoach.services.some(
  //                     (s: any) => s.serviceId === appointment.service.id
  //                 );
  //                 if (!serviceExists) {
  //                     existingCoach.services.push({
  //                         serviceId: appointment.service.id,
  //                         serviceName: appointment.service.descriptions,
  //                         price: appointment.service.price
  //                     });
  //                 }
  //             }
  //         }

  //         const coachesList = Array.from(coachMap.values());

  //         coachesList.sort((a, b) =>
  //             new Date(b.lastAppointmentDate).getTime() - new Date(a.lastAppointmentDate).getTime()
  //         );

  //         return coachesList;
  //     } catch (error) {
  //         if (error instanceof NotFoundException) {
  //             throw error;
  //         }
  //         console.error('Error in findAllHiredCoach:', error);
  //         throw new Error('Failed to fetch coaches list');
  //     }
  // }

  async findAllHiredCoach(
    userId: string,
    category?: string, // Add optional category parameter
  ): Promise<{ coachesList: any[]; appointmentsDate: any[] }> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          user_id: userId,
          status: {
            in: ['CONFIRMED', 'COMPLETED'], // Include both CONFIRMED and COMPLETED statuses
          },
        },
        include: {
          service: {
            include: {
              user: {
                include: {
                  user_documents: true,
                  accounts: true,
                  roles: true,
                },
              },
            },
          },
          schedule: true,
          slot: true,
          subscription: true,
        },
        orderBy: {
          created_at: 'desc',
        },
      });

      if (!appointments || appointments.length === 0) {
        throw new NotFoundException('No appointments found for this user');
      }

      let coachesList = [];
      let appointmentsDate = [];

      for (const appointment of appointments) {
        const coachId = appointment.service.user_id;
        const coachDetails = appointment.service.user;
        const coach = await this.prisma.user.findUnique({
          where: { id: coachId },
        });

        appointmentsDate.push(appointment.slot.date);

        coachesList.push({
          orderId: appointment.id,
          coachId: coachId,
          name: coachDetails.name || appointment.service.service_provider_name,
          email: coachDetails.email,
          status: appointment.status,
          hiredDate: this.formatHiredDate(appointment.created_at),
          category: appointment.service.category,
          totalAppointments: 1, // This will now count per appointment, not per coach
          lastAppointmentDate: appointment.slot.date,
          appointmentDate: appointment.slot.date,
          appointmentTime: appointment.slot.start_time,
          avater: coach.avatar,
          type: appointment?.type,
          services: [
            {
              serviceId: appointment.service.id,
              serviceName: appointment.service.descriptions,
              price: appointment.service.price,
            },
          ],
          timeleft: this.getAvailableTime(
            appointment.slot.date,
            appointment.slot.start_time,
          ),
          schedule: appointment.schedule,
          slot: appointment.slot,
          subscription_details: appointment.subscription,
        });
      }

      // Filter by category if provided
      if (category) {
        coachesList = coachesList.filter(
          (coach) => coach.category.toLowerCase() === category.toLowerCase(),
        );
      }

      // Sort by appointment date (most recent first)
      coachesList.sort(
        (a, b) =>
          new Date(b.appointmentDate).getTime() -
          new Date(a.appointmentDate).getTime(),
      );

      return { coachesList, appointmentsDate };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error in findAllHiredCoach:', error);
      throw new Error('Failed to fetch coaches list');
    }
  }

  async findDashboardData(
    userId: string,
  ): Promise<{ totalPending: number; totalComplete: number }> {
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      throw new Error('Invalid user ID');
    }

    try {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          user_id: userId,
          status: 'CONFIRMED',
          // status: {
          //     in: ['CONFIRMED', 'COMPLETED'] // Include both CONFIRMED and COMPLETED statuses
          // }
        },
        include: {
          service: true,
        },
      });
      const completeappointments = await this.prisma.appointment.findMany({
        where: {
          user_id: userId,
          status: 'CONFIRMED',
          // status: {
          //     in: ['CONFIRMED', 'COMPLETED'] // Include both CONFIRMED and COMPLETED statuses
          // }
        },
        include: {
          service: true,
        },
      });
      let totalPending = 0;
      let totalComplete = 0;

      for (const appointment of appointments) {
        totalPending += appointment.service.price;
      }
      for (const appointment of completeappointments) {
        totalComplete += appointment.service.price;
      }

      return { totalPending, totalComplete };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error in findAllHiredCoach:', error);
      throw new Error('Failed to fetch coaches list');
    }
  }

  async findAllAppointmentCalendarDate(userId: string) {
    try {
      // console.log('userId', userId)
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const appointments = await this.prisma.appointment.findMany({
        where: {
          user_id: userId,
        },
        // status: 'CONFIRMED',

        include: {
          service: {
            include: {
              user: {
                include: {
                  user_documents: true,
                  accounts: true,
                  roles: true,
                },
              },
            },
          },
          schedule: true,
          slot: true,
          user: true,
        },
      });
      //console.log('appointments', appointments)
      if (!appointments || appointments.length === 0) {
        throw new NotFoundException('No appointments found for this user');
      }

      let AllDate = [];
      for (const appointment of appointments) {
        //console.log('appointment', appointment)

        const user = appointment?.service?.user;
        // const userDocuments = user?.user_documents || [];
        AllDate.push({
          orderId: appointment?.id,
          name: user?.name,
          //status: appointment.status,
          avatar: user?.avatar,
          //hireDate: appointment.created_at,
          //hiredDate: this.formatHiredDate(appointment.created_at),
          date: appointment?.slot?.date,
          timeFrom: appointment.slot?.start_time,
          timeTo: appointment?.slot?.end_time,
          subTitle: user?.profession,
          // timeleft: this.getAvailableTime(appointment.slot.date, appointment.slot.start_time),
          // price : appointment.service.price,
        });
      }

      return AllDate;
    } catch (error) {
      throw error;
    }
  }

  async getalltransection(userId: string) {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
      if (!user) {
        throw new NotFoundException('Coach not found');
      }

      const transections = await this.prisma.transaction.findMany({
        where: {
          userId: userId,
        },
      });
      if (!transections) {
        throw new NotFoundException('Appointment not found');
      }

      return transections;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Transection not found');
        }
      }
      throw error; // Let other errors be handled by Nest's global exception filter
    }
  }

  create(createUserDashboardDto: CreateUserDashboardDto) {
    return 'This action adds a new userDashboard';
  }

  findOne(id: number) {
    return `This action returns a #${id} userDashboard`;
  }

  update(id: number, updateUserDashboardDto: UpdateUserDashboardDto) {
    return `This action updates a #${id} userDashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} userDashboard`;
  }

  async findAllSubscription(userId: string) {
    try {
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const appointments = await this.prisma.appointment.findMany({
        where: {
          user_id: userId,

          schedule: {
            frequency: 'MONTHLY',
          },
          // status: 'CONFIRMED',
        },
        include: {
          service: {
            include: {
              user: {
                include: {
                  user_documents: true,
                  accounts: true,
                  roles: true,
                },
              },
            },
          },
          schedule: true,
          slot: true,
          user: true,
          subscription: true,
        },
      });
      //console.log('appointments', appointments)
      if (!appointments || appointments.length === 0) {
        throw new NotFoundException('No appointments found for this user');
      }

      let AllDate = [];
      for (const appointment of appointments) {
        //console.log('appointment', appointment)

        const user = appointment?.user;
        // const userDocuments = user?.user_documents || [];
        AllDate.push({
          orderId: appointment?.id,
          name: appointment?.service?.user?.name,
          //status: appointment.status,
          avatar: appointment?.service?.user?.avatar,
          hireDate: appointment.created_at,
          price: appointment?.service?.price,
          status: appointment.status,
          //hiredDate: this.formatHiredDate(appointment.created_at),
          //date: appointment?.slot?.date,
          //   timeFrom: appointment?.slot?.start_time,
          //   timeTo: appointment?.slot?.end_time,
          subTitle: user?.profession,
          type: appointment?.type || 'SUBSCRIPTION',
          aproval: appointment?.coachApproval, // timeleft: this.getAvailableTime(appointment.slot.date, appointment.slot.start_time),
          // price : appointment.service.price,
          subscription_details: appointment?.subscription,
        });
      }

      const reversedAllDate = [...AllDate].reverse();
      return reversedAllDate;
    } catch (error) {
      throw error;
    }
  }

  private formatHiredDate(hiredDate: any) {
    const dateObj = new Date(hiredDate);

    const date = dateObj.toLocaleDateString('en-GB'); // Example: "22/04/2025"
    const time = dateObj.toLocaleTimeString('en-GB'); // Example: "11:51:17"

    return { date, time };
  }
  // private getAvailableTime(bookedISOTime: any, endTimeStr: any) {
  //     const bookedDate: any = new Date(bookedISOTime);

  //     console.log('bookedISOTime', bookedISOTime, "bookedDate", bookedDate, "endTimeStr", endTimeStr);

  //     // Parse end time string into hours and minutes
  //     const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

  //     // Create a new Date object for the same day as the booked time but with the end time
  //     const endTime: any = new Date(bookedDate);
  //     endTime.setHours(endHours, endMinutes, 0, 0);

  //     // Calculate the difference in milliseconds
  //     const diffMs = endTime - bookedDate;
  //     console.log('diffMs', diffMs)

  //     // If the difference is negative, the end time has already passed
  //     if (diffMs <= 0) {
  //         return 'No available time left';
  //     }

  //     // Convert to hours and minutes
  //     const diffMinutes = Math.floor(diffMs / 60000);
  //     const hours = Math.floor(diffMinutes / 60);
  //     const minutes = diffMinutes % 60;

  //     return `${hours}h ${minutes}m available`;
  // }

  private getAvailableTime(bookedISOTime: any, endTimeStr: any) {
    const now = new Date(); // Current local time
    const bookedDateUTC = new Date(bookedISOTime); // Booked date in UTC

    // Convert booked date to local time
    const bookedDateLocal = new Date(
      bookedDateUTC.getUTCFullYear(),
      bookedDateUTC.getUTCMonth(),
      bookedDateUTC.getUTCDate(),
      bookedDateUTC.getUTCHours(),
      bookedDateUTC.getUTCMinutes(),
      bookedDateUTC.getUTCSeconds(),
    );

    // Parse end time (e.g., "11:00") in local time
    const [endHours, endMinutes] = endTimeStr.split(':').map(Number);

    // Create the target end time on the booked date
    const endTime = new Date(bookedDateLocal);
    endTime.setHours(endHours, endMinutes, 0, 0);

    // Calculate difference between NOW and the end time
    const diffMs = endTime.getTime() - now.getTime();

    if (diffMs <= 0) {
      return 'No available time left';
    }

    // Calculate days, hours, minutes remaining
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const remainingMsAfterDays = diffMs % (1000 * 60 * 60 * 24);
    const diffHours = Math.floor(remainingMsAfterDays / (1000 * 60 * 60));
    const remainingMsAfterHours = remainingMsAfterDays % (1000 * 60 * 60);
    const diffMinutes = Math.round(remainingMsAfterHours / (1000 * 60));

    // Format the output
    let result = '';
    if (diffDays > 0) {
      result += `${diffDays}d `;
    }
    if (diffHours > 0 || diffDays > 0) {
      result += `${diffHours}h `;
    }
    result += `${diffMinutes}m`;
    console.log('result', result);
    // Return the formatted string
    return result + ' remaining';
  }
}
