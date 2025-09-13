import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Get,
  Query,
  UseInterceptors,
  UploadedFiles,
  Patch,
  Param,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MessageService } from './message.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { Request } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { ChatAccessGuard } from '../guards/chat-access.guard';
import { MessageStatus } from '@prisma/client';

@ApiBearerAuth()
@ApiTags('Message')
@UseGuards(JwtAuthGuard, ChatAccessGuard)
@Controller('chat/message')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @ApiOperation({ summary: 'Send message' })
  @ApiConsumes('multipart/form-data')
  @Post()
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'attachment', maxCount: 10 }, // Allow up to 10 files
      ],
      {
        storage: memoryStorage(),
      },
    ),
  )
  async create(
    @Req() req: Request,
    @Body() createMessageDto: CreateMessageDto,
    @UploadedFiles()
    files: {
      attachment?: Express.Multer.File[];
    },
  ) {
    const user_id = req.user.userId;
    const message = await this.messageService.create(
      user_id,
      createMessageDto,
      files?.attachment || [], // Pass all attachments
    );

    return {
      success: message.success,
      message: message.message,
      data: message.data,
    };
  }

  @ApiOperation({ summary: 'Get all messages' })
  @Get()
  async findAll(
    @Req() req: Request,
    @Query()
    query: { conversation_id: string; limit?: number; cursor?: string },
  ) {
    const user_id = req.user.userId;
    const conversation_id = query.conversation_id as string;
    const limit = Number(query.limit);
    const cursor = query.cursor as string;
    try {
      const messages = await this.messageService.findAll({
        user_id,
        conversation_id,
        limit,
        cursor,
      });
      return messages;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // PATCH /chat/message/:id/status
  @Patch(':id/status')
  async updateMessageStatus(
    @Param('id') message_id: string,
    @Body('status') status: MessageStatus,
  ) {
    await this.messageService.updateMessageStatus(message_id, status);
    return { success: true, message: 'Message status updated' };
  }

  // POST /chat/message/:id/read
  @Post(':id/read')
  async readMessage(@Param('id') message_id: string) {
    await this.messageService.readMessage(message_id);
    return { success: true, message: 'Message marked as read' };
  }

  // PATCH /chat/user/:id/status
  @Patch('/user/:id/status')
  async updateUserStatus(
    @Param('id') user_id: string,
    @Body('status') status: string,
  ) {
    await this.messageService.updateUserStatus(user_id, status);
    return { success: true, message: 'User status updated' };
  }
}
