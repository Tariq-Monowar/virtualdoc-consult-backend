import { PrismaClient, MessageStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class ChatRepository {
  /**
   * Update message status
   * @returns
   */
  static async updateMessageStatus(message_id: string, status: MessageStatus) {
    // if message exist
    const message = await prisma.message.findFirst({
      where: {
        id: message_id,
      },
    });

    if (!message) {
      return;
    }

    await prisma.message.update({
      where: {
        id: message_id,
      },
      data: {
        status,
      },
    });
  }

  /**
   * Update user status
   * @returns
   */
  static async updateUserStatus(user_id: string, status: string) {
    // if user exist
    const user = await prisma.user.findFirst({
      where: {
        id: user_id,
      },
    });

    if (!user) {
      return;
    }
    return await prisma.user.update({
      where: { id: user_id },
      data: {
        availability: status,
      },
    });
  }

  static async searchMessages(params: {
    conversation_id?: string;
    search_term: string;
    page?: number;
    limit?: number;
  }) {
    const { conversation_id, search_term, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where = {
      deleted_at: null,
      message: {
        contains: search_term,
        mode: 'insensitive' as const,
      },
      ...(conversation_id && { conversation_id }),
    };

    const [messages, total] = await Promise.all([
      prisma.message.findMany({
        where,
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          attachments: true,
        },
        orderBy: {
          created_at: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.message.count({ where }),
    ]);

    return {
      data: messages,
      meta: {
        total,
        page,
        limit,
        total_pages: Math.ceil(total / limit),
      },
    };
  }

  // In chat.repository.ts
  static async getUserProfile(userId: string) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          first_name: true,
          last_name: true,
          email: true,
          avatar: true,
        },
      });
      return user;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  }
}
