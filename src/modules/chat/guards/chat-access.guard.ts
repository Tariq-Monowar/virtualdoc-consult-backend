import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Role } from '../../../common/guard/role/role.enum';

@Injectable()
export class ChatAccessGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const request = context.switchToHttp().getRequest();
      const user = request.user;
      if (!user) {
        throw new ForbiddenException('User not authenticated');
      }

      const userDetails = await this.prisma.user.findUnique({
        where: { id: user.userId },
        include: {
          role_users: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!userDetails) {
        throw new ForbiddenException('User not found');
      }

      // Admin has full access
      if (userDetails.type === Role.ADMIN) {
        return true;
      }

      // For GET /chat/conversation (list all conversations)
      if (
        request.method === 'GET' &&
        !request.params.id &&
        !request.path.includes('admin')
      ) {
        // Allow access - filtering will be done in the service
        return true;
      }

      // For all other operations, validate specific access
      return this.validateChatAccess(request, userDetails);
    } catch (error) {
      throw new ForbiddenException(error.message || 'Chat access denied');
    }
  }

  private async validateChatAccess(request: any, user: any): Promise<boolean> {
    const method = request.method;
    const body = request.body || {};
    const params = request.params || {};
    const query = request.query || {};

    // For user status update (PATCH /chat/message/user/:id/status)
    if (
      method === 'PATCH' &&
      request.params.id &&
      request.path.includes('/user/') &&
      request.path.endsWith('/status')
    ) {
      // Allow if the user is updating their own status or is admin
      if (user.id === request.params.id || user.type === 'ADMIN') {
        return true;
      } else {
        throw new ForbiddenException(
          "You are not allowed to update this user's status",
        );
      }
    }

    // For message status update (PATCH /chat/message/:id/status)
    if (
      (method === 'PATCH' || method === 'POST') &&
      request.params.id &&
      request.path.includes('/status')
    ) {
      // Fetch the message and its conversation
      const message = await this.prisma.message.findUnique({
        where: { id: request.params.id },
        include: { conversation: true },
      });
      if (!message || !message.conversation) {
        throw new ForbiddenException('Message or conversation not found');
      }
      // Check if user is a participant
      if (
        message.conversation.creator_id !== user.id &&
        message.conversation.participant_id !== user.id
      ) {
        throw new ForbiddenException('You are not part of this conversation');
      }
      return true;
    }

    // For message read (POST /chat/message/:id/read)
    if (
      method === 'POST' &&
      request.params.id &&
      request.path.includes('/read')
    ) {
      // Fetch the message and its conversation
      const message = await this.prisma.message.findUnique({
        where: { id: request.params.id },
        include: { conversation: true },
      });
      if (!message || !message.conversation) {
        throw new ForbiddenException('Message or conversation not found');
      }
      // Check if user is a participant
      if (
        message.conversation.creator_id !== user.id &&
        message.conversation.participant_id !== user.id
      ) {
        throw new ForbiddenException('You are not part of this conversation');
      }
      return true;
    }

    // Try to get conversation_id from either body or query
    const conversation_id = body.conversation_id || query.conversation_id;
    // console.log('Conversation ID:', body);

    // For new conversation creation
    if (method === 'POST' && !conversation_id) {
      return this.validateNewConversation(body, user);
    }

    // For message creation
    if (method === 'POST' && conversation_id) {
      return this.validateMessageCreation({ ...body, conversation_id }, user);
    }

    // For existing conversation access
    if (method === 'GET' && params.id) {
      return this.validateExistingConversation(params.id, user.id);
    }

    // For message search and list
    if (method === 'GET' && query.conversation_id) {
      return this.validateExistingConversation(query.conversation_id, user.id);
    }

    return false;
  }

  private async validateNewConversation(
    body: any,
    user: any,
  ): Promise<boolean> {
    if (!body.appointment_id || !body.participant_id) {
      throw new ForbiddenException(
        'Missing required fields for conversation creation',
      );
    }

    // Validate appointment exists and is valid
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: body.appointment_id,
        status: 'CONFIRMED',
        paymentMethod: { not: 'UNPAID' },
        OR: [
          {
            user_id: user.id,
            service: {
              user_id: body.participant_id,
            },
          },
          {
            service: {
              user_id: user.id,
            },
            user_id: body.participant_id,
          },
        ],
      },
    });

    if (!appointment) {
      throw new ForbiddenException('Invalid or unpaid appointment');
    }

    // Check for existing conversation
    const existingConversation = await this.prisma.conversation.findFirst({
      where: {
        appointment_id: body.appointment_id,
        OR: [
          {
            creator_id: user.id,
            participant_id: body.participant_id,
          },
          {
            creator_id: body.participant_id,
            participant_id: user.id,
          },
        ],
      },
    });

    if (existingConversation) {
      throw new ForbiddenException(
        'Conversation already exists for this appointment',
      );
    }

    return true;
  }

  private async validateMessageCreation(
    body: any,
    user: any,
  ): Promise<boolean> {
    if (!body.conversation_id) {
      throw new ForbiddenException('Conversation ID is required');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: { id: body.conversation_id },
      include: {
        appointment: true,
      },
    });

    if (!conversation) {
      throw new ForbiddenException('Conversation not found');
    }

    // Validate user is part of the conversation
    if (
      conversation.creator_id !== user.id &&
      conversation.participant_id !== user.id
    ) {
      throw new ForbiddenException('You are not part of this conversation');
    }

    // Validate appointment is still valid
    if (
      conversation.appointment.status !== 'CONFIRMED' ||
      conversation.appointment.paymentMethod === 'UNPAID'
    ) {
      throw new ForbiddenException(
        'Cannot send messages for invalid appointment',
      );
    }

    return true;
  }

  private async validateExistingConversation(
    conversationId: string,
    userId: string,
  ): Promise<boolean> {
    if (!conversationId) {
      throw new ForbiddenException('Conversation ID is required');
    }

    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        OR: [{ creator_id: userId }, { participant_id: userId }],
      },
    });

    if (!conversation) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    return true;
  }
}
