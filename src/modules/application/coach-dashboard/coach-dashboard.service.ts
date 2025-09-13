import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCoachDashboardDto } from './dto/create-coach-dashboard.dto';
import { UpdateCoachDashboardDto } from './dto/update-coach-dashboard.dto';
import { AppointmentService } from '../appointment/appointment.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';
import { NotificationService } from 'src/modules/application/notification/notification.service';
import { NotificationGateway } from 'src/modules/application/notification/notification.gateway';

@Injectable()
export class CoachDashboardService {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly prisma: PrismaService,
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  // create(createCoachDashboardDto: CreateCoachDashboardDto) {
  //   return 'This action adds a new coachDashboard';
  // }

  // findAll() {
  //   return `This action returns all coachDashboard`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} coachDashboard`;
  // }

  // update(id: number, updateCoachDashboardDto: UpdateCoachDashboardDto) {
  //   return `This action updates a #${id} coachDashboard`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} coachDashboard`;
  // }

  async findAllconsumer(userId: string, category?: string) {
    try {
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const appointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
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
        orderBy: {
          created_at: 'desc',
        },
      });

      // if (!appointments || appointments.length === 0) {
      //   throw new NotFoundException('No appointments found for this user');
      // }

      let appointmentsDate = [];
      let customerlist = [];
      for (const appointment of appointments) {
        //console.log('appointment', appointment)
        appointmentsDate.push(appointment.slot.date);

        const user = appointment?.user;
        // const userDocuments = user?.user_documents || [];

        if (appointment?.schedule?.frequency === 'DAILY') {
          customerlist.push({
            orderId: appointment?.id,
            customer_id: user?.id,
            customer_name: user?.name,
            status: appointment?.status,
            customer_avatar: SojebStorage.url(
              `${appConfig().storageUrl.avatar}${user?.avatar}`,
            ),
            //hireDate: appointment.created_at,
            hiredDate: this.formatHiredDate(appointment?.created_at),
            appointmentDate: appointment?.slot.date,
            appointmentTime: appointment?.slot?.start_time,
            ServiceType: 'ONE TIME',
            timeleft: this.getAvailableTime(
              appointment?.slot?.date,
              appointment?.slot?.start_time,
            ),
            price: appointment?.service?.price,
          });
        } else {
          customerlist.push({
            orderId: appointment?.id,
            customer_id: user?.id,
            customer_name: user?.name,
            status: appointment?.status,
            customer_avatar: SojebStorage.url(
              `${appConfig().storageUrl.avatar}${user?.avatar}`,
            ),
            //hireDate: appointment.created_at,
            hiredDate: this.formatHiredDate(appointment?.created_at),
            appointmentDate: 'full month',
            appointmentTime: 'Disccuss with customer',
            ServiceType: 'SUBSCRIPTION',
            timeleft: 'Disccuss with customer',
            price: appointment?.service?.price,
            subscription_details: appointment.subscription,
          });
        }
      }
      //console.log('customerlist', customerlist)
      return { customerlist, appointmentsDate };
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

  async findAllAppointmentCalendarDate(userId: string) {
    try {
      console.log('userId', userId);
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const appointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
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
        },
      });
      console.log('appointments', appointments);
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

  async findAllAppointments(userId: string) {
    try {
      // console.log('userId', userId)
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const appointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
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
        },
      });
      console.log('appointments', appointments);
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
          name: user?.name,
          //status: appointment.status,
          avatar: user?.avatar,
          //hireDate: appointment.created_at,
          //hiredDate: this.formatHiredDate(appointment.created_at),
          date: appointment?.slot?.date,
          timeFrom: appointment?.slot?.start_time,
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

  async findAllSubscription(userId: string) {
    try {
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const appointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
          },
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
        },
      });
      // console.log('appointments', appointments)
      if (!appointments || appointments.length === 0) {
        //throw new NotFoundException('No appointments found for this user');
        return [];
      }

      let AllDate = [];
      for (const appointment of appointments) {
        //console.log('appointment', appointment)

        const user = appointment?.user;
        // const userDocuments = user?.user_documents || [];
        AllDate.push({
          orderId: appointment?.id,
          name: user?.name,
          //status: appointment.status,
          avatar: user?.avatar,
          hireDate: appointment.created_at,
          price: appointment?.service?.price,
          //hiredDate: this.formatHiredDate(appointment.created_at),
          //date: appointment?.slot?.date,
          timeFrom: appointment?.slot?.start_time,
          timeTo: appointment?.slot?.end_time,
          subTitle: user?.profession,
          type: appointment?.type || 'SUBSCRIPTION',
          aproval: appointment?.coachApproval, // timeleft: this.getAvailableTime(appointment.slot.date, appointment.slot.start_time),
          // price : appointment.service.price,
        });
      }
      const reversedAllDate = [...AllDate].reverse();
      return reversedAllDate;
    } catch (error) {
      throw error;
    }
  }

  async updateSubscriptionApproval(userId: string, appointmentId: string) {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }
      if (
        !appointmentId ||
        typeof appointmentId !== 'string' ||
        appointmentId.trim() === ''
      ) {
        throw new Error('Invalid appointment ID');
      }

      const appointment = await this.prisma.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          coachApproval: true,
        },
      });

      return 'Subscription approved successfully';
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Appointment not found');
        }
      }
      throw error; // Let other errors be handled by Nest's global exception filter
    }
  }

  async makecomplete(userId: string, appointmentId: string) {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const appointmentExist = await this.prisma.appointment.findUnique({
        where: {
          id: appointmentId,
          service: {
            user_id: userId,
          },
        },
        include: {
          service: true,
          slot: true,
          schedule: true,
          subscription: true,
        },
      });
      if (!appointmentExist) {
        throw new NotFoundException('Appointment not found');
      }
      if (appointmentExist?.schedule?.frequency === 'DAILY') {
        if (new Date() < appointmentExist?.slot?.date) {
          throw new NotFoundException('Appointment date is not finished yet');
        }
      }
      if (appointmentExist?.schedule?.frequency !== 'DAILY') {
        if (
          appointmentExist?.subscription &&
          appointmentExist.subscription.length > 0 &&
          new Date() < appointmentExist.subscription[0]?.endDate
        ) {
          throw new NotFoundException('Appointment date is not finished yet');
        }
      }

      if (appointmentExist.status === 'COMPLETED') {
        throw new NotFoundException('Appointment already completed');
      }

      const appointment = await this.prisma.appointment.update({
        where: {
          id: appointmentId,
        },
        data: {
          status: 'COMPLETED',
          updated_at: new Date(),
        },
      });
      const coachearn = appointmentExist?.service?.price * 0.8;
      await this.prisma.wallet.create({
        data: {
          userId: appointmentExist?.service?.user_id,
          balance: coachearn,
          currency: 'usd',
          appointment_id: appointmentId,
          type: 'CREDIT',
          updatedAt: new Date(),
          createdAt: new Date(),
        },
      });

      // === NEW: Notification logic for review request ===
      try {
        // 1. Get the service thumbnail (type = 'thumbnail')
        const thumbnailDoc = await this.prisma.serviceDocument.findFirst({
          where: {
            service_id: appointmentExist.service.id,
            type: 'thumbnail',
          },
        });
        const imageUrl = thumbnailDoc
          ? SojebStorage.url(
              `${appConfig().storageUrl.documents}${thumbnailDoc.file_name}`,
            )
          : null;

        // 2. Calculate the average rating for the service
        const reviews = await this.prisma.review.findMany({
          where: { service_id: appointmentExist.service.id },
          select: { rating: true },
        });
        const rating =
          reviews.length > 0
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
            : null;

        // 3. Build the review card data
        const reviewCardData = {
          image: imageUrl,
          duration: appointmentExist.service?.duration || null,
          rating,
          title: appointmentExist.service?.category || null,
          description: appointmentExist.service?.descriptions || null,
          // Add more fields as needed
        };

        // 4. Create the notification
        const notification = await this.notificationService.create({
          receiver_id: appointmentExist.user_id, // patient
          sender_id: appointmentExist.service.user_id, // coach
          entity_id: appointmentExist.id, // appointment ID
          notification_event_text: JSON.stringify(reviewCardData),
        });

        // 5. Fetch the notification with its event (to get the JSON data)
        const fullNotification = await this.prisma.notification.findUnique({
          where: { id: notification.id },
          include: {
            notification_event: true,
          },
        });

        // console.log('fullNotification', fullNotification);

        // 6. Emit real-time notification to the patient
        if (fullNotification) {
          this.notificationGateway.server
            .to(fullNotification.receiver_id)
            .emit('newNotification', {
              ...fullNotification,
              reviewCardData: fullNotification.notification_event?.text
                ? JSON.parse(fullNotification.notification_event.text)
                : null,
            });
        }
      } catch (err) {
        // Optionally log the error, but do not throw
        console.error('Failed to create or emit review notification:', err);
      }
      // === END NEW ===

      return {
        statusCode: 200,
        success: true,
        message: 'Subscription upgrade successfully',
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Appointment not found');
        }
      }
      throw error; // Let other errors be handled by Nest's global exception filter
    }
  }

  async getTransactionDashboard(userId: string) {
    try {
      // Input validation
      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        throw new Error('Invalid user ID');
      }

      const transactions = await this.prisma.transaction.findMany({
        where: {
          getuserId: userId,
          type: 'WITHDRAWAL',
        },
      });
      const totalWithdrawalAmount = transactions.reduce(
        (sum, transaction) => sum + transaction.amount,
        0,
      );

      // if (!transactions) {
      //   throw new NotFoundException('Transaction not found');
      // }
      const appointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
          },
          status: 'CONFIRMED',
        },
        include: {
          service: true,
          // slot: true,
          // schedule: true,
          subscription: true,
        },
      });
      const totalEarnings = appointments.reduce((sum, appointment) => {
        const eightyPercentOfPrice = appointment.service.price * 0.8;
        return sum + eightyPercentOfPrice;
      }, 0);
      //console.log(appointments, "asjkldhjidhjdh")

      const dashboardData = {
        totalWithdrawalAmount,
        transactions,
        totalEarnings,
      };

      return dashboardData;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          throw new NotFoundException('Transection not found');
        }
      }
      throw error; // Let other errors be handled by Nest's global exception filter
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
          getuserId: userId,
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

  async mainDashboardData(userId: string) {
    try {
      // console.log('userId', userId)
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

      const CompleteAppointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
          },
          status: 'COMPLETED',
        },
        include: {
          service: true,
          // schedule: true,
          // slot: true,
          // user: true,
        },
      });

      const totalEarning = CompleteAppointments.reduce((sum, appointment) => {
        return sum + appointment.service.price;
      }, 0);

      const RunningAppointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
          },
          status: 'CONFIRMED',
        },
        include: {
          service: true,
          // schedule: true,
          // slot: true,
          // user: true,
        },
      });

      let result = {
        completeAppointment: CompleteAppointments.length,
        runningAppointment: RunningAppointments.length,
        totalEarning,
      };

      return result;
    } catch (error) {
      throw error;
    }
  }

  async incomeChartdetails(userId: string, range: string = '6') {
    try {
      // console.log('userId', userId)
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

      const CompleteAppointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
          },
          status: 'COMPLETED',
        },
        include: {
          service: true,
          // schedule: true,
          slot: true,
          // user: true,
        },
      });

      const chartData = processAppointmentsForIncomeChart(
        CompleteAppointments,
        range.toString(),
      );

      const RunningAppointments = await this.prisma.appointment.findMany({
        where: {
          service: {
            user_id: userId,
          },
          status: 'CONFIRMED',
        },
        include: {
          service: true,
          // schedule: true,
          // slot: true,
          // user: true,
        },
      });

      let result = {
        completeAppointment: CompleteAppointments.length,
        runningAppointment: RunningAppointments.length,
        chartData,
      };

      return result;
    } catch (error) {
      throw error;
    }
  }

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

    return result + ' remaining';
  }

  // Example usage and function moved outside the class
}

// Place this function outside of the class definition
function processAppointmentsForIncomeChart(appointments, selectedRange = '6') {
  // Get current date and month names
  const monthNames = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const currentDate = new Date();

  // Calculate how many months to show based on selected range
  const monthsToShow = parseInt(selectedRange);

  // Create an array of months we want to display (last X months)
  const displayMonths = [];
  const monthData = {};

  // Initialize monthData with empty values for the desired months
  for (let i = 0; i < monthsToShow; i++) {
    const date = new Date(currentDate);
    date.setMonth(date.getMonth() - i);

    const year = date.getFullYear();
    const month = date.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
    const monthName = monthNames[month];

    // Store month name and key for display
    displayMonths.unshift(monthName);
    monthData[monthKey] = {
      monthName,
      total: 0,
    };
  }

  // Process each appointment
  appointments.forEach((appointment) => {
    if (
      !appointment.slot ||
      !appointment.slot.date ||
      !appointment.service ||
      !appointment.service.price
    ) {
      return; // skip invalid appointments
    }

    const appointmentDate = new Date(appointment.slot.date);
    const year = appointmentDate.getFullYear();
    const month = appointmentDate.getMonth();
    const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;

    // Only count if it's in our selected range
    if (monthData[monthKey]) {
      monthData[monthKey].total += appointment.service.price;
    }
  });

  // Prepare the series data in the format expected by the chart
  const seriesData = displayMonths.map((monthName) => {
    // Find the monthKey for this monthName
    const monthKey = Object.keys(monthData).find(
      (key) => monthData[key].monthName === monthName,
    );

    return {
      x: monthName,
      y: monthKey ? monthData[monthKey].total : 0,
    };
  });

  // Generate colors based on relationship to current month
  const currentMonthIndex = displayMonths.indexOf(
    monthNames[currentDate.getMonth()],
  );
  const colors = displayMonths.map((month, index) => {
    if (index < currentMonthIndex) {
      return '#A6C1C0'; // Light teal for past months
    } else if (index === currentMonthIndex) {
      return '#004D49'; // Dark teal for the current month
    } else {
      return '#F3F4F6'; // Light gray for future months
    }
  });

  return {
    seriesData,
    colors,
    monthNames: displayMonths,
    maxYValue: Math.max(...seriesData.map((item) => item.y)), // For setting chart max value
    currentMonthIndex,
  };
}

// Example usage:
