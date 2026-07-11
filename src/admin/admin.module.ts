import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PaymentsModule } from '../payments/payments.module';
import { PaymentProvider } from '../payments/providers/payment.provider';
import { FakePaymentProvider } from '../payments/providers/fake-payment.provider';
import { IyzicoPaymentProvider } from '../payments/providers/iyzico-payment.provider';
import { AdminController } from './admin.controller';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

@Module({
  imports: [AuthModule, PaymentsModule],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminGuard,
    {
      provide: PaymentProvider,
      useClass: process.env.IYZICO_API_KEY
        ? IyzicoPaymentProvider
        : FakePaymentProvider,
    },
  ],
})
export class AdminModule {}
