import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, NotFoundException, HttpException, HttpStatus } from '@nestjs/common';
import { RefundService } from './refund.service';
import { CreateRefundDto } from './dto/create-refund.dto';
import { UpdateRefundDto } from './dto/update-refund.dto';
import { ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { Request, response } from 'express';
import { PrismaService } from 'src/prisma/prisma.service';

@Controller('refund')
export class RefundController {
  constructor(private readonly refundService: RefundService,
    private readonly prisma: PrismaService
  ) { }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create-connect-account-refund')
  async create(@Body() createRefundDto: CreateRefundDto,
    @Req() req: Request,) {

    try {
      const response = await StripePayment.createConnectedAccount(createRefundDto.email);
      //console.log(response, "wekjdhnwejilhewjdhewjdhewdjwej")
      const user_id = req.user.userId;
      console.log(user_id, "user_id")
      const user = await this.prisma.user.findUnique({
        where: {  id: user_id }
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
      await this.prisma.user.update({
        where: { id: user_id },
        data:{
          banking_id: response.id,
        }
      })
      console.log(user, "user")
      return response
    }
    catch (error) {
      throw error
    }
    


  }



  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('create-connect-account/:account_id')
  StripeConnect(
    //@Body() createRefundDto: CreateRefundDto,
   
    @Param('account_id') account_id: string) {
    return StripePayment.createOnboardingAccountLink(account_id);
  }


  // @ApiBearerAuth()
  // @UseGuards(JwtAuthGuard)
  // @Post('refund-money-back/:accountId/:appointmentId')
  // refundmoney(
  //   //@Body() createRefundDto: CreateRefundDto,
  //    @Req() req: Request,
  //   @Param('accountId') accountId: string,
  //   @Param('appointmentId') appointmentId: string) {

  //     const userId = req.user.userId;
      
  //   return this.refundService.refundmoneyWithPayOut(userId, accountId, appointmentId);
  // }



  @ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Post('refund-money-add-wallet/:appointmentId')
async refundmoneyaddWallet(
  @Req() req: Request,
  @Param('appointmentId') appointmentId: string
) {
  try {
    const userId = req.user.userId;
    return await this.refundService.refundmoneyToWallet(userId, appointmentId);
  } catch (error) {
    // You can customize the error response based on your needs
    throw new HttpException({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'An error occurred while processing the refund',
      details: error.message
    }, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


  @Get()
  findAll() {
    return this.refundService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.refundService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRefundDto: UpdateRefundDto) {
    return this.refundService.update(+id, updateRefundDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.refundService.remove(+id);
  }
}
