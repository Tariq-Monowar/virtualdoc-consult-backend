import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { WithdrawService } from './withdraw.service';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { UpdateWithdrawDto } from './dto/update-withdraw.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request, response } from 'express';

@Controller('withdraw')
export class WithdrawController {
  constructor(private readonly withdrawService: WithdrawService) {}

  @Post()
  create(@Body() createWithdrawDto: CreateWithdrawDto) {
    return this.withdrawService.create(createWithdrawDto);
  }

  @Get()
  findAll() {
    return this.withdrawService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.withdrawService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateWithdrawDto: UpdateWithdrawDto) {
    return this.withdrawService.update(+id, updateWithdrawDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.withdrawService.remove(+id);
  }


    @ApiBearerAuth()
    @UseGuards(JwtAuthGuard)
    @Post('withdraw-money/:accountId')
    withdrawmoney(
      @Body() createWithdrawDto: CreateWithdrawDto,
       @Req() req: Request,
     @Param('accountId') accountId: string,
     // @Param('appointmentId') appointmentId: string
     ) {
  
        const userId = req.user.userId;
        
      return this.withdrawService.withdrawmoneyWithBankAccount(userId, accountId, createWithdrawDto);
    }
}
