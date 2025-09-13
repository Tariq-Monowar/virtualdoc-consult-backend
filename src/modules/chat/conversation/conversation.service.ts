import { Injectable } from '@nestjs/common';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import appConfig from '../../../config/app.config';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../../common/helper/date.helper';
import { MessageGateway } from '../message/message.gateway';

@Injectable()
export class ConversationService extends PrismaClient {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {
    super();
  }

  async create(createConversationDto: CreateConversationDto) {
    try {
      const data: any = {};

      if (createConversationDto.creator_id) {
        data.creator_id = createConversationDto.creator_id;
      }
      if (createConversationDto.participant_id) {
        data.participant_id = createConversationDto.participant_id;
      }
      if (createConversationDto.appointment_id) {
        data.appointment_id = createConversationDto.appointment_id;
      }

      // Validate appointment first
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: data.appointment_id,
          status: 'CONFIRMED',
          paymentMethod: {
            not: 'UNPAID',
          },
          OR: [
            {
              user_id: data.creator_id,
              service: {
                user_id: data.participant_id,
              },
            },
            {
              service: {
                user_id: data.creator_id,
              },
              user_id: data.participant_id,
            },
          ],
        },
        include: {
          service: true,
          user: true,
        },
      });

      if (!appointment) {
        return {
          success: false,
          message: 'Invalid or unpaid appointment',
        };
      }

      // Check if conversation exists for this specific appointment
      let conversation = await this.prisma.conversation.findFirst({
        where: {
          appointment_id: data.appointment_id,
          OR: [
            {
              creator_id: data.creator_id,
              participant_id: data.participant_id,
            },
            {
              creator_id: data.participant_id,
              participant_id: data.creator_id,
            },
          ],
        },
        select: {
          id: true,
          creator_id: true,
          participant_id: true,
          appointment_id: true,
          created_at: true,
          updated_at: true,
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          participant: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          messages: {
            orderBy: {
              created_at: 'desc',
            },
            take: 1,
            select: {
              id: true,
              message: true,
              created_at: true,
            },
          },
        },
      });

      if (conversation) {
        return {
          success: false,
          message: 'Conversation already exists for this appointment',
          data: conversation,
        };
      }

      // Create new conversation
      conversation = await this.prisma.conversation.create({
        data: {
          creator: {
            connect: { id: data.creator_id },
          },
          participant: {
            connect: { id: data.participant_id },
          },
          appointment: {
            connect: { id: data.appointment_id },
          },
        },
        select: {
          id: true,
          creator_id: true,
          participant_id: true,
          appointment_id: true,
          created_at: true,
          updated_at: true,
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          participant: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          messages: {
            orderBy: {
              created_at: 'desc',
            },
            take: 1,
            select: {
              id: true,
              message: true,
              created_at: true,
            },
          },
        },
      });

      // Add avatar URLs
      if (conversation.creator.avatar) {
        conversation.creator['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + conversation.creator.avatar,
        );
      }
      if (conversation.participant.avatar) {
        conversation.participant['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + conversation.participant.avatar,
        );
      }

      // Determine roles based on the appointment
      const isCreatorCoach = appointment.service.user_id === data.creator_id;
      const isParticipantCoach =
        appointment.service.user_id === data.participant_id;

      // Append role and service name to the name field
      conversation.creator.name = `${conversation.creator.name} (${isCreatorCoach ? 'Coach' : 'Patient'} - ${appointment.service.category})`;
      conversation.participant.name = `${conversation.participant.name} (${isParticipantCoach ? 'Coach' : 'Patient'} - ${appointment.service.category})`;

      // Notify both users about new conversation
      this.messageGateway.server.to(data.creator_id).emit('newConversation', {
        conversation,
        type: 'created',
      });

      console.log('Sending to participant:', data.participant_id);
      this.messageGateway.server
        .to(data.participant_id)
        .emit('newConversation', {
          conversation,
          type: 'received',
        });

      return {
        success: true,
        message: 'Conversation created successfully',
        data: conversation,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll(userId: string, isAdmin: boolean) {
    try {
      const whereClause = isAdmin
        ? {} // No filter for admin
        : {
            OR: [{ creator_id: userId }, { participant_id: userId }],
          };

      const conversations = await this.prisma.conversation.findMany({
        where: whereClause,
        orderBy: {
          updated_at: 'desc',
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          participant: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          appointment: {
            include: {
              service: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          messages: {
            orderBy: {
              created_at: 'desc',
            },
            take: 1,
            select: {
              id: true,
              message: true,
              created_at: true,
            },
          },
        },
      });

      // add image url and custom name
      for (const conversation of conversations) {
        if (conversation.creator?.avatar) {
          conversation.creator['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + conversation.creator.avatar,
          );
        }
        if (conversation.participant?.avatar) {
          conversation.participant['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + conversation.participant.avatar,
          );
        }

        // Add custom name logic (role-based)
        if (conversation.appointment && conversation.appointment.service) {
          const serviceUserId = conversation.appointment.service.user_id;
          const serviceCategory = conversation.appointment.service.category;

          const isCreatorCoach = serviceUserId === conversation.creator.id;
          const isParticipantCoach =
            serviceUserId === conversation.participant.id;

          conversation.creator.name = `${conversation.creator.name} (${isCreatorCoach ? 'Coach' : 'Patient'} - ${serviceCategory})`;
          conversation.participant.name = `${conversation.participant.name} (${isParticipantCoach ? 'Coach' : 'Patient'} - ${serviceCategory})`;
        }
      }

      return {
        success: true,
        data: conversations,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAllForAdmin() {
    try {
      const conversations = await this.prisma.conversation.findMany({
        select: {
          id: true,
          creator_id: true,
          participant_id: true,
          appointment_id: true,
          created_at: true,
          updated_at: true,
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          participant: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          appointment: {
            select: {
              id: true,
              status: true,
              service: {
                select: {
                  id: true,
                  service_provider_name: true, // Make sure 'name' exists on the service model
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: {
              created_at: 'desc',
            },
            select: {
              id: true,
              message: true,
              created_at: true,
            },
          },
        },
        orderBy: {
          updated_at: 'desc',
        },
      });

      // Add avatar URLs for creator and participant
      return conversations.map((conversation) => ({
        ...conversation,
        creator: {
          ...conversation.creator,
          avatar_url: conversation.creator.avatar
            ? SojebStorage.url(
                appConfig().storageUrl.avatar + conversation.creator.avatar,
              )
            : null,
        },
        participant: {
          ...conversation.participant,
          avatar_url: conversation.participant.avatar
            ? SojebStorage.url(
                appConfig().storageUrl.avatar + conversation.participant.avatar,
              )
            : null,
        },
      }));
    } catch (error) {
      throw error;
    }
  }

  async findOne(id: string) {
    try {
      const conversation = await this.prisma.conversation.findUnique({
        where: { id },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          participant: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          appointment: {
            include: {
              service: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      // add image url
      if (conversation.creator?.avatar) {
        conversation.creator['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + conversation.creator.avatar,
        );
      }
      if (conversation.participant?.avatar) {
        conversation.participant['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + conversation.participant.avatar,
        );
      }

      return {
        success: true,
        data: conversation,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateConversationDto: UpdateConversationDto) {
    try {
      // First check if conversation exists and is valid
      const existingConversation = await this.prisma.conversation.findUnique({
        where: { id },
        include: {
          appointment: true,
        },
      });

      if (!existingConversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      // Check if appointment is still valid
      if (
        existingConversation.appointment &&
        (existingConversation.appointment.status !== 'CONFIRMED' ||
          existingConversation.appointment.paymentMethod === 'UNPAID')
      ) {
        return {
          success: false,
          message: 'Cannot update conversation with invalid appointment',
        };
      }

      const data = {};
      if (updateConversationDto.creator_id) {
        data['creator_id'] = updateConversationDto.creator_id;
      }
      if (updateConversationDto.participant_id) {
        data['participant_id'] = updateConversationDto.participant_id;
      }

      await this.prisma.conversation.update({
        where: { id },
        data: {
          ...data,
          updated_at: DateHelper.now(),
        },
      });

      return {
        success: true,
        message: 'Conversation updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      // First check if conversation exists and is valid
      const conversation = await this.prisma.conversation.findUnique({
        where: { id },
        include: {
          appointment: true,
          messages: true,
        },
      });

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      // Check if appointment is still active
      if (
        conversation.appointment &&
        conversation.appointment.status === 'CONFIRMED' &&
        conversation.appointment.paymentMethod !== 'UNPAID'
      ) {
        return {
          success: false,
          message: 'Cannot delete conversation with active appointment',
        };
      }

      // Delete all messages first
      await this.prisma.message.deleteMany({
        where: {
          conversation_id: id,
        },
      });

      // Then delete the conversation
      await this.prisma.conversation.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Conversation and related messages deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
