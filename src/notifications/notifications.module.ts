import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsController } from './notifications.controller';
import { FcmPushSender } from './fcm-push-sender';
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
    {
      provide: PushSender,
      // useFactory (useClass DEĞİL): sağlayıcı seçimi DI anında, yani
      // ConfigModule .env'i process.env'e yükledikten SONRA yapılır. useClass
      // ternary'si modül import anında değerlenir; o an FIREBASE_SERVICE_ACCOUNT
      // henüz tanımsızdır → her zaman Console seçilirdi (gerçek FCM hiç
      // devreye girmezdi). Bu iyzico'da yaşadığımız hatanın aynısı.
      useFactory: (prisma: PrismaService): PushSender =>
        process.env.FIREBASE_SERVICE_ACCOUNT
          ? new FcmPushSender(prisma)
          : new ConsolePushSender(),
      inject: [PrismaService],
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
