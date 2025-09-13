import { Injectable } from '@nestjs/common';
import { CreateContactDto } from './dto/create-contact.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ContactService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createContactDto: CreateContactDto) {
    try {
      const data = {};
      if (createContactDto.name) {
        data['name'] = createContactDto.name;
      }
      
      if (createContactDto.email) {
        data['email'] = createContactDto.email;
      }
      if (createContactDto.position) {
        data['position'] = createContactDto.position;
      }
      if (createContactDto.message) {
        data['message'] = createContactDto.message;
      }

      await this.prisma.contact.create({
        data: data,
      });

      return {
        success: true,
        message: 'Submitted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
