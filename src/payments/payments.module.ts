import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentProvider } from './providers/payment.provider';
import { FakePaymentProvider } from './providers/fake-payment.provider';
import { IyzicoPaymentProvider } from './providers/iyzico-payment.provider';

@Module({
  imports: [ConversationsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PaymentProvider,
      // useFactory (useClass DEĞİL): sağlayıcı seçimi DI anında, yani
      // ConfigModule .env'i process.env'e yükledikten SONRA yapılır. useClass
      // ternary'si modül import anında değerlenir; o an IYZICO_API_KEY henüz
      // tanımsızdır → her zaman Fake seçilirdi (canlı iyzico hiç devreye girmezdi).
      useFactory: (): PaymentProvider =>
        process.env.IYZICO_API_KEY
          ? new IyzicoPaymentProvider()
          : new FakePaymentProvider(),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
