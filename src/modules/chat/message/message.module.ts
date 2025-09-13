import { Global, Module } from '@nestjs/common';
import { MessageService } from './message.service';
import { MessageController } from './message.controller';
import { MessageGateway } from './message.gateway';
import { RecordingModule } from 'src/modules/recording/recording.module';

@Global()
@Module({
  imports: [RecordingModule],
  controllers: [MessageController],
  providers: [
    MessageService, 
    MessageGateway,
  ],
  exports: [MessageGateway],
})
export class MessageModule {}
