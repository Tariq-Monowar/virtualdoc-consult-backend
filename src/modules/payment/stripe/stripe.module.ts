import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { ConversationService } from '../../chat/conversation/conversation.service';
@Module({
  controllers: [StripeController],
    providers: [StripeService, ConversationService],
  })
export class StripeModule {}
