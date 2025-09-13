import { Injectable } from '@nestjs/common';
import { CreateAdminDashboardDto } from './dto/create-admin-dashboard.dto';
import { UpdateAdminDashboardDto } from './dto/update-admin-dashboard.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { AppointmentService } from '../appointment/appointment.service';
import { registerSchema } from 'class-validator';

@Injectable()
export class AdminDashboardService {

  constructor(private readonly appointmentService: AppointmentService,
    private readonly prisma: PrismaService,
  ) { }

  findAll() {
    return `This action returns all adminDashboard`;
  }

  findOne(id: number) {
    return `This action returns a #${id} adminDashboard`;
  }

  update(id: number, updateAdminDashboardDto: UpdateAdminDashboardDto) {
    return `This action updates a #${id} adminDashboard`;
  }

  remove(id: number) {
    return `This action removes a #${id} adminDashboard`;
  }

  async findAllCoaches() {
    try {
      const coaches = await this.prisma.user.findMany({
        where: {
          type: 'coach',
        },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          avatar: true,
          // Include all fields you want to return
          email: true,
          name: true,
          phone_number: true,
          type: true,
          categories: true,
          min_price: true,
          max_price: true,
          user_documents: true,
          bio: true,
          education: true,
          approved_at: true,

        }
      });
      return coaches;
    } catch (error) {
      throw error;
    }
  }

  async findAllClients() {
    try {
      const clients = await this.prisma.user.findMany({
        where: {
          type: 'user',
        },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          //   // Include all fields you want to return
          //   email: true,
          //   name: true,
          //   phone_number: true,
          //   type: true,
          //   categories: true,
          //   min_price: true,

          //   // ... include other non-sensitive fields
          //   // Explicitly EXCLUDE password and other sensitive fields





          approved_at: true,
          availability: true,
          email: true,
          username: true,
          name: true,

          avatar: true,
          banner: true,
          // "profession": null,
          // "phone_number": "01310102020asd",
          // "country": "CU",
          // "state": null,
          // "local_government": null,
          // "city": "sdf",
          // "address": "sadfasdf",
          // "zip_code": null,
          // "gender": "male",
          // "date_of_birth": null,
          // "billing_id": "cus_SA8bN8jCpYLy74",
          // "type": "user",
          // "email_verified_at": "2025-04-20T03:13:50.551Z",
          // "blaclisted": false,
          // "is_two_factor_enabled": 0,
          // "two_factor_secret": null,
          // "age": 6,
          // "language": [],
          // "education": null,
          // "location": null,
          // "experience": null,
          // "categories": [],

        }

      });
      let total_spent = 0;
      var total_appointments = 0;
      let allclient = []
      for (const client of clients) {
        const appointments = await this.prisma.appointment.findMany(
          {
            where: {
              user_id: client.id,
              status: 'CONFIRMED'

            },
            include: {
              service: true
            }
          },


        );
        for (const appointment of appointments) {
          total_spent += appointment?.service?.price;
        }
        total_appointments = appointments.length;

        allclient.push({ ...client, total_spent, total_appointments });
      }
      return allclient;
    } catch (error) {
      throw error;
    }
  }


  async admindashboardDData() {
    try {
      //console.log("dsalkfcjdsjfhjfc")
      const patients = await this.prisma.appointment.findMany({
        where: {
          status: { in: ["CONFIRMED", "COMPLETED"] }
        }
      });

      const coaches = await this.prisma.user.findMany({
        where: {
          type: 'coach',
        },
      });
      const revenue = await this.prisma.appointment.findMany({
        where: {
          status:  "COMPLETED"
        },
        include:{
          service: true,
        }
      });
      let total_revenue = 0;
      revenue.forEach((appointment) => {
        total_revenue += appointment.service.price * 0.2; // Assuming 20% is the platform's cut
      });
      const total_patients = patients.length;
      const total_appointment = patients.length
      const total_coaches = coaches.length;
      return {
        total_patients,
        total_appointment,
        total_coaches,
        total_revenue
      };
    } catch (err) {

    }
  }


  async findAllAppointment() {
    try {
      const appointments = await this.prisma.appointment.findMany({
        include: {
          user: true,
          service: {
            include: {
              user: true
            }
          },
          slot: true,
          subscription: true,
        }
      });
      const safeAppointments = appointments.map((appointment) => {
        const { password: _userPassword, ...safeUser } = appointment.user;
        const { password: _serviceUserPassword, ...safeServiceUser } = appointment.service.user;

        return {
          ...appointment,
          user: safeUser,
          service: {
            ...appointment.service,
            user: safeServiceUser,
          },
        };
      });
      return safeAppointments;
    } catch (error) {
      throw error;
    }
  }






  async findAllFinancialManagement() {
    try {
      const appointments = await this.prisma.appointment.findMany({
        where: {
          status: "COMPLETED",
        },
        include:{
          service: true,
        }
      });
      
      let CoachToPiad= 0;
      let TotalRevenue = 0;
      const safeAppointments = appointments.map((appointment) => {
        CoachToPiad += (appointment.service.price * 0.8);
        TotalRevenue += (appointment.service.price * 0.2);
      });

      const canceledAppointments = await this.prisma.appointment.findMany({
        where: {
          status: "CANCELLED",
        },
        include:{
          service: true,
        }
      });
      let TotalCanceled = 0;
      canceledAppointments.forEach((appointment) => {
        TotalCanceled += appointment.service.price;
      });

      const ActiveAppointments = await this.prisma.appointment.findMany({
        where: {
          status: "CONFIRMED",
        },
        include:{
          service: true,
        }
      });
      let TotalActive = 0;
      ActiveAppointments.forEach((appointment) => {
        TotalActive += appointment.service.price;
      });




      return {CoachToPiad, TotalRevenue, TotalCanceled, TotalActive};
    } catch (error) {
      throw error;
    }
  }






 
      
     

 async findAllFinancialChart() {
  try {
    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        service: true,
      },
      orderBy: {
        updated_at: 'asc',
      },
    });

    // Group earnings by date
    let totalAmmount = 0;
    const earningsByDate = appointments.reduce((acc, appointment) => {
      const dateStr = appointment.updated_at.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      const amount = (appointment.service?.price) * 0.2 || 0;

      totalAmmount += appointment.service?.price;

      if (acc[dateStr]) {
        acc[dateStr] += amount;
      } else {
        acc[dateStr] = amount;
      }
      
      return acc;
    }, {} as Record<string, number>);

   
    const earningsData = Object.entries(earningsByDate).map(([date, amount]) => ({
      date,
      amount,
    }));

    
    const years = new Set<number>();
    appointments.forEach(appointment => {
      years.add(appointment.updated_at.getFullYear());
    });

    
    const yearRanges = Array.from(years)
      .sort((a, b) => b - a) 
      .map(year => year.toString());

    return {
      earningsData,
      yearRanges,
      totalAmmount
    };
  } catch (error) {
    throw new Error(`Failed to fetch financial chart data: ${error.message}`);
  }
 }






 async findAllDashboardChart() {
  try {
    const coaches = await this.prisma.user.findMany({
      where: {
        type: 'coach',
      },
      select: {
        id: true,
        categories: true,
        approved_at: true,
      }
    });

    // Count occurrences of each category
    const categoryCounts: Record<string, number> = {};
    let totalCategories = 0;

    coaches.forEach(coach => {
      coach.categories.forEach(category => {
        if (category) { // Skip empty categories
          categoryCounts[category] = (categoryCounts[category] || 0) + 1;
          totalCategories++;
        }
      });
    });

    // Calculate percentages
    const labels = Object.keys(categoryCounts);
    const series = labels.map(category => {
      return Math.round((categoryCounts[category] / totalCategories) * 100);
    });

    // Prepare chart data
    const chartData = {
      options: {
        chart: {
          type: 'donut',
        },
        labels: labels,
        colors: ['#22CAAD', '#548885', '#F9C80E', '#EB3D4D'], // You can adjust colors as needed
        legend: {
          show: false,
        },
        dataLabels: {
          enabled: false,
        },
        plotOptions: {
          pie: {
            donut: {
              size: '70%',
              labels: {
                show: false
              }
            },
            expandOnClick: false,
          },
        },
        stroke: {
          width: 0,
        },
        tooltip: {
          enabled: false,
        },
      },
      series: series
    };

    return chartData;
  } catch (error) {
    throw new Error(`Failed to fetch financial chart data: ${error.message}`);
  }
}




}