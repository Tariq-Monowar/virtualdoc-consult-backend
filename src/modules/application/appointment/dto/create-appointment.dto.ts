// src/appointments/dto/create-appointment.dto.ts
import { 
    IsString, 
    IsNotEmpty, 
    IsOptional, 
    IsObject, 
    IsArray, 
    IsBoolean,
    IsEnum,
    ValidateNested,
    IsDateString,
    IsNumber,
    IsPositive
  } from 'class-validator';
  import { Type } from 'class-transformer';
  import { ApiProperty } from '@nestjs/swagger';
  import { AppointmentStatus } from '@prisma/client';
  
  class PersonalInfoDto {
    @ApiProperty({ example: 'John Doe' })
    @IsString()
    @IsNotEmpty()
    fullName: string;
  }
  
  // class QuestionAnswerDto {
  //   @ApiProperty({ example: 'What is your preferred contact method?' })
  //   @IsString()
  //   question: string;
  
  //   @ApiProperty({ example: 'Email' })
  //   @IsString()
  //   answer: string;
  // }
  
  export class CreateAppointmentDto {
    @ApiProperty({ 
      description: 'ID of the user booking the appointment',
      example: 'clnx8z9u7000008jy5xq5b2q3'
    })
    // @IsString()
    // @IsNotEmpty()
    userId: string;
  
    @ApiProperty({ 
      description: 'ID of the service being booked',
      example: 'clnx8z9u7000008jy5xq5b2q4'
    })
    @IsString()
    @IsNotEmpty()
    serviceId: string;
  
    @ApiProperty({ 
      description: 'ID of the schedule for the appointment',
      example: 'clnx8z9u7000008jy5xq5b2q5'
    })
    @IsString()
    @IsNotEmpty()
    scheduleId: string;
  
    @ApiProperty({ 
      description: 'ID of the time slot being booked',
      example: 'clnx8z9u7000008jy5xq5b2q6'
    })


    @IsString()
    slotId: string;
  
    @ApiProperty({ 
      description: 'Payment method for the appointment',
      example: 'CREDIT_CARD',
      required: false,
      default: 'UNPAID'
    })
    @IsString()
    @IsOptional()
    paymentMethod?: string = 'UNPAID';
  
    @ApiProperty({
      description: 'Payment details object',
      example: { 
        cardLastFour: '4242', 
        paymentId: 'pi_123456789' 
      },
      required: false,
      default: {}
    })
    @IsObject()
    @IsOptional()
    paymentDetails?: Record<string, any> = {};
  
    @ApiProperty({ 
      description: 'Personal information of the client',
      type: PersonalInfoDto,
      required: false
    })
    @IsOptional()
    @ValidateNested()
    @Type(() => PersonalInfoDto)
    personalInfo?: PersonalInfoDto;
  
    
    
    @IsArray()
    @IsOptional()
    questionAnswers?: string[]

  
    @ApiProperty({
      description: 'Initial status of the appointment',
      enum: AppointmentStatus,
      required: false,
      default: AppointmentStatus.PENDING
    })
    @IsEnum(AppointmentStatus)
    @IsOptional()
    status?: AppointmentStatus = AppointmentStatus.PENDING;
  }


  export class CreateSlotDto {
    @IsDateString()
    date: string;
  
    @IsString()
    @IsNotEmpty()
    start_time: string;
  
    @IsString()
    @IsNotEmpty()
    end_time: string;
  
    @IsString()
    @IsNotEmpty()
    schedule_id: string;
  }


  
export class CreatePaymentIntentDto {
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNotEmpty()
  @IsString()
  currency: string;

  

  @IsNotEmpty()
  @IsString()
  appointmentId: string;
}