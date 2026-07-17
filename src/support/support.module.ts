import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminGuard } from '../admin/admin.guard';
import { SupportController } from './support.controller';
import { SupportAdminController } from './support-admin.controller';
import { SupportService } from './support.service';

@Module({
  imports: [AuthModule],
  controllers: [SupportController, SupportAdminController],
  providers: [SupportService, AdminGuard],
  exports: [SupportService],
})
export class SupportModule {}
