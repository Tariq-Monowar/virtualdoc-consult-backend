import { IsNotEmpty } from "class-validator";

export class CreateWithdrawDto {
    
    @IsNotEmpty()
    amount: number;
   
}
