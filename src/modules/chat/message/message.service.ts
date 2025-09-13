import { Injectable } from '@nestjs/common';
import { MessageStatus, PrismaClient } from '@prisma/client';
import appConfig from '../../../config/app.config';
import { CreateMessageDto } from './dto/create-message.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatRepository } from '../../../common/repository/chat/chat.repository';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../../common/helper/date.helper';
import { MessageGateway } from './message.gateway';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { Role } from 'src/common/guard/role/role.enum';

@Injectable()
export class MessageService extends PrismaClient {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {
    super();
  }

  // Update the message service to find appointments automatically
  async create(
    user_id: string,
    createMessageDto: CreateMessageDto,
    attachments: Express.Multer.File[] = [],
  ) {
    try {
      // console.log('CreateMessageDto:', createMessageDto);
      // console.log('Attachments:', attachments);

      const data: any = {};

      if (createMessageDto.conversation_id) {
        data.conversation_id = createMessageDto.conversation_id;
      }

      if (createMessageDto.receiver_id) {
        data.receiver_id = createMessageDto.receiver_id;
      }

      if (createMessageDto.message) {
        data.message = createMessageDto.message;
      }

      // check if conversation exists
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          id: data.conversation_id,
        },
      });

      // Before each DB call, log the input
      // console.log('Finding conversation:', data.conversation_id);

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      // Always use the appointment_id from the conversation
      let appointment_id = conversation.appointment_id;

      // console.log('appointment_id:', appointment_id);
      // Validate appointment status
      const appointment = await this.prisma.appointment.findFirst({
        where: {
          id: appointment_id,
          // New appointment structure uses user_id directly
          user_id: {
            in: [conversation.creator_id, conversation.participant_id],
          },
          // Service provider is the other participant
          service: {
            user_id: {
              in: [conversation.creator_id, conversation.participant_id],
            },
          },
          // Status must be CONFIRMED
          status: 'CONFIRMED',
          // Payment must be completed (not UNPAID)
          paymentMethod: {
            not: 'UNPAID',
          },
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

      if (!appointment) {
        return {
          success: false,
          message: 'Cannot send message: No active paid appointment found',
        };
      }

      // check if receiver exists
      const receiver = await this.prisma.user.findFirst({
        where: {
          id: data.receiver_id,
        },
      });

      if (!receiver) {
        return {
          success: false,
          message: 'Receiver not found',
        };
      }

      // Handle attachments if provided
      let attachmentData = [];
      if (attachments && attachments.length > 0) {
        // Process each attachment
        for (const attachment of attachments) {
          const appointmentFolder = appointment_id || 'unknown';
          const fileName = `${Date.now()}_${attachment.originalname}`;
          const filePath = `${appointmentFolder}/${fileName}`;
          await SojebStorage.put(
            appConfig().storageUrl.attachments + filePath,
            attachment.buffer,
          );

          // Create attachment record
          const attachmentRecord = await this.prisma.attachment.create({
            data: {
              name: attachment.originalname,
              type: attachment.mimetype,
              size: attachment.size,
              file: fileName,
            },
          });

          attachmentData.push(attachmentRecord);
        }
      }

      // Create message with attachments
      const message = await this.prisma.message.create({
        data: {
          ...data,
          status: MessageStatus.SENT,
          sender_id: user_id,
          attachments: {
            connect: attachmentData.map((attachment) => ({
              id: attachment.id,
            })),
          },
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          attachments: {
            select: {
              id: true,
              name: true,
              type: true,
              size: true,
              file: true,
            },
          },
        },
      });

      // Add file URLs to attachments
      if (message.attachments) {
        message.attachments = message.attachments.map((attachment) => ({
          ...attachment,
          file_url: SojebStorage.url(
            appConfig().storageUrl.attachments +
              `${appointment_id}/` +
              attachment.file,
          ),
        }));
      }

      // Add avatar URL for sender
      if (message.sender?.avatar) {
        message.sender['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + message.sender.avatar,
        );
      }

      // update conversation updated_at
      await this.prisma.conversation.update({
        where: {
          id: data.conversation_id,
        },
        data: {
          updated_at: DateHelper.now(),
        },
      });

      // Send real-time message
      this.messageGateway.server.to(data.receiver_id).emit('message', {
        from: user_id,
        data: {
          message: {
            id: message.id,
            message_id: message.id,
            body_text: message.message,
            from: message.sender_id,
            conversation_id: message.conversation_id,
            created_at: message.created_at,
            attachments:
              message.attachments?.map((attachment) => ({
                id: attachment.id,
                name: attachment.name,
                type: attachment.type,
                size: attachment.size,
                file: attachment.file,
                file_url: SojebStorage.url(
                  appConfig().storageUrl.attachments +
                    `${appointment_id}/` +
                    attachment.file,
                ),
              })) || [],
          },
        },
      });

      console.log("clicked message.service")

      return {
        success: true,
        data: message,
        message: 'Message sent successfully',
      };
    } catch (error) {
      console.error('MessageService Error:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll({
    user_id,
    conversation_id,
    limit = 20,
    cursor,
  }: {
    user_id: string;
    conversation_id: string;
    limit?: number;
    cursor?: string;
  }) {
    try {
      const userDetails = await UserRepository.getUserDetails(user_id);

      const where_condition = {
        AND: [{ id: conversation_id }],
      };

      if (userDetails.type != Role.ADMIN) {
        where_condition['OR'] = [
          { creator_id: user_id },
          { participant_id: user_id },
        ];
      }

      const conversation = await this.prisma.conversation.findFirst({
        where: {
          ...where_condition,
        },
      });

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      const appointment_id = conversation.appointment_id;

      const paginationData = {};
      if (limit) {
        paginationData['take'] = limit;
      }
      if (cursor) {
        paginationData['cursor'] = cursor ? { id: cursor } : undefined;
      }

      const messages = await this.prisma.message.findMany({
        ...paginationData,
        where: {
          conversation_id: conversation_id,
        },
        orderBy: {
          created_at: 'asc',
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          attachments: {
            select: {
              id: true,
              name: true,
              type: true,
              size: true,
              file: true,
            },
          },
        },
      });

      // Add file URLs to attachments
      for (const message of messages) {
        if (message.attachments) {
          message.attachments = message.attachments.map((attachment) => ({
            ...attachment,
            file_url: SojebStorage.url(
              appConfig().storageUrl.attachments +
                `${appointment_id}/` +
                attachment.file,
            ),
          }));
        }
      }

      // Add avatar URLs
      for (const message of messages) {
        if (message.sender?.avatar) {
          message.sender['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + message.sender.avatar,
          );
        }
        if (message.receiver?.avatar) {
          message.receiver['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + message.receiver.avatar,
          );
        }
      }

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateMessageStatus(message_id: string, status: MessageStatus) {
    return await ChatRepository.updateMessageStatus(message_id, status);
  }

  async readMessage(message_id: string) {
    return await ChatRepository.updateMessageStatus(
      message_id,
      MessageStatus.READ,
    );
  }

  async updateUserStatus(user_id: string, status: string) {
    return await ChatRepository.updateUserStatus(user_id, status);
  }
}
