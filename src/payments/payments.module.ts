import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymentProvider } from './providers/payment.provider';
import { FakePaymentProvider } from './providers/fake-payment.provider';
import { IyzicoPaymentProvider } from './providers/iyzico-payment.provider';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PaymentProvider,
      useClass: process.env.IYZICO_API_KEY
        ? IyzicoPaymentProvider
        : FakePaymentProvider,
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
