import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class UserService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll(currentUserId: string) {

    try {
      // Get the current user's details to determine their role
      const currentUser = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        include: {
          role_users: {
            include: {
              role: true
            }
          }
        }
      });

      if (!currentUser) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // If admin, return all users
      if (currentUser.type === 'admin') {
        const users = await this.prisma.user.findMany({
          where: { status: 1 },
          select: {
            id: true,
            email: true,
            name: true,
            type: true,
            avatar: true,
          },
        });

        // Add avatar URLs
        const usersWithAvatarUrls = users.map(user => ({
          ...user,
          avatar_url: user.avatar ? SojebStorage.url(appConfig().storageUrl.avatar + user.avatar) : null
        }));

        return {
          success: true,
          data: usersWithAvatarUrls,
        };
      }

      // For regular users (patients) and coaches, filter based on appointments
      let userIds = [];

      if (currentUser.type === 'user') {
        // If patient, get all coaches they have appointments with
        const appointments = await this.prisma.appointment.findMany({
          where: {
            user_id: currentUserId,
            status: {
              in: ['CONFIRMED', 'COMPLETED']
            },
            paymentMethod: {
              not: 'UNPAID'
            }
          },
          include: {
            service: {
              include: {
                user: true
              }
            }
          }
        });

        console.log(appointments);

        // Extract coach IDs from appointments
        userIds = appointments.map(appointment => appointment.service.user_id);
      } else if (currentUser.type === 'coach') {
        // If coach, get all patients they have appointments with
        const appointments = await this.prisma.appointment.findMany({
          where: {
            service: {
              user_id: currentUserId
            },
            status: {
              in: ['CONFIRMED', 'COMPLETED']
            },
            paymentMethod: {
              not: 'UNPAID'
            }
          },
          include: {
            user: true
          }
        });

        // Extract patient IDs from appointments
        userIds = appointments.map(appointment => appointment.user_id);
      }

      // Remove duplicates
      userIds = [...new Set(userIds)];

      // Get user details
      const users = await this.prisma.user.findMany({
        where: {
          id: {
            in: userIds
          },
          status: 1
        },
        select: {
          id: true,
          email: true,
          name: true,
          type: true,
          avatar: true,
        },
      });

      // Add avatar URLs
      const usersWithAvatarUrls = users.map(user => ({
        ...user,
        avatar_url: user.avatar ? SojebStorage.url(appConfig().storageUrl.avatar + user.avatar) : null
      }));

      return {
        success: true,
        data: usersWithAvatarUrls,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
