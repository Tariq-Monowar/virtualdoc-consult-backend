import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateInformationDto } from './dto/create-information.dto';
import { UpdateInformationDto } from './dto/update-information.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InformationService {

  constructor(private readonly prisma: PrismaService) { }


  create(createInformationDto: CreateInformationDto) {
    return 'This action adds a new information';
  }

  async filterCoaches(
    limit: number = 10,
    page: number = 1,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    gender?: string
  ) {
    const whereClause: any = {
      type: 'coach', // assuming you're filtering only coaches
    };

    if (category) {
      whereClause.categories = {
        has: category, // Prisma `has` checks if array contains this value
      };
    }

    if (gender) {
      whereClause.gender = gender;
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      whereClause.AND = [];

      if (minPrice !== undefined) {
        whereClause.AND.push({ min_price: { gte: minPrice } });
      }
      if (maxPrice !== undefined) {
        whereClause.AND.push({ max_price: { lte: maxPrice } });
      }

      if (!whereClause.AND.length) delete whereClause.AND;
    }

    const users = await this.prisma.user.findMany({
      where: whereClause,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: {
        created_at: 'desc',
      },

    });
    const safeUsers = users.map(({ password, ...userWithoutPassword }) => userWithoutPassword);
    return safeUsers;
  }


  findAll() {
    return `This action returns all information`;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found.`);
    }
    if (user?.type === 'coach') {
      return user;
    }
    return "not find any coach"
  }

  update(id: number, updateInformationDto: UpdateInformationDto) {
    return `This action updates a #${id} information`;
  }

  remove(id: number) {
    return `This action removes a #${id} information`;
  }
}
