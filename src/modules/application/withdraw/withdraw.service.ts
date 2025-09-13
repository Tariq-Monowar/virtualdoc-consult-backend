import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { UpdateWithdrawDto } from './dto/update-withdraw.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WithdrawService {
  constructor(private readonly prisma: PrismaService) { }


  create(createWithdrawDto: CreateWithdrawDto) {
    return 'This action adds a new withdraw';
  }

  findAll() {
    return `This action returns all withdraw`;
  }

  findOne(id: number) {
    return `This action returns a #${id} withdraw`;
  }

  update(id: number, updateWithdrawDto: UpdateWithdrawDto) {
    return `This action updates a #${id} withdraw`;
  }

  remove(id: number) {
    return `This action removes a #${id} withdraw`;
  }



  async withdrawmoneyWithBankAccount(userId: string, account_id: string, createWithdrawDto: CreateWithdrawDto) {
  try {
    const amount = createWithdrawDto.amount;

    const user = await this.prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'User not found',
        error: 'Not Found'
      });
    }
    
    if (user.banking_id !== account_id) {
      throw new NotFoundException({
        statusCode: 404,
        message: 'Account not found',
        error: 'Not Found'
      });
    }

    if (user.totalbalance < amount) {
      throw new BadRequestException({
        statusCode: 400,
        message: 'Insufficient balance',
        error: 'Bad Request'
      });
    }
  
    const transaction = await this.prisma.transaction.create({
      data: {
        userId: userId,
        getuserId:userId,
        amount: amount,
        currency: "usd",
        status: "PENDING",
        type: "WITHDRAWAL",
      },
    });
  
    const metadata = {
      user_id: userId,
      account_id: account_id,
      transaction_id: transaction.id,
    }
  
    const response = await StripePayment.createPayout(account_id, amount, "usd", metadata);
    
    return {
      success: true,
      statusCode: 200,
      data: response,
      message: 'Withdrawal request processed successfully'
    };
  
  } catch (error) {
    // Handle known exceptions
    if (error instanceof NotFoundException || error instanceof BadRequestException
    ) {
      throw error;
    }
    
    // Handle Stripe errors or other unexpected errors
    throw new InternalServerErrorException({
      statusCode: 500,
      message: 'Failed to process withdrawal',
      error: 'Internal Server Error',
      details: error.message
    });
  }
}
}