import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('User')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll(@Request() req) {
    try {
      const users = await this.userService.findAll(req.user.userId);
      return users;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
