import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import {
  ConsolePushSender,
  NotificationsService,
  PushSender,
} from './notifications.service';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    { provide: PushSender, useClass: ConsolePushSender },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
