import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';

@Injectable()
export class NotificationService {
  constructor(private prisma: PrismaService) {}

  async create(createNotificationDto: CreateNotificationDto) {
    // 1. Create NotificationEvent with JSON string in text
    const notificationEvent = await this.prisma.notificationEvent.create({
      data: {
        text: createNotificationDto.notification_event_text,
        type: 'REVIEW', // or any type you want
        status: 1,
      },
    });

    // 2. Create Notification referencing the NotificationEvent
    return this.prisma.notification.create({
      data: {
        receiver_id: createNotificationDto.receiver_id,
        sender_id: createNotificationDto.sender_id,
        notification_event_id: notificationEvent.id,
        entity_id: createNotificationDto.entity_id,
        status: 1,
      },
    });
  }

  async findAll(userId?: string) {
    // Optionally filter by user
    const where = userId ? { receiver_id: userId } : {};
    return this.prisma.notification.findMany({
      where,
      include: { notification_event: true },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
      include: { notification_event: true },
    });
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async update(id: string, updateNotificationDto: UpdateNotificationDto) {
    return this.prisma.notification.update({
      where: { id },
      data: {
        ...updateNotificationDto,
        updated_at: new Date(),
      },
    });
  }

  async remove(id: string) {
    return this.prisma.notification.delete({
      where: { id },
    });
  }
}
