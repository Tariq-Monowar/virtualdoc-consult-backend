import { IsEmail, IsNotEmpty } from "class-validator";

export class CreateRefundDto {
    // @IsEmail()
  // @IsNotEmpty()
  email: string;

  // ... other fields you might need for refunds
}
