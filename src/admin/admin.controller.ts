import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean } from 'class-validator';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';

class ResolveDto {
  @IsBoolean()
  approve: boolean;
}

@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('stats')
  stats() {
    return this.admin.stats();
  }

  @Get('verifications')
  verificationQueue() {
    return this.admin.verificationQueue();
  }

  @Post('verifications/:id')
  @HttpCode(HttpStatus.OK)
  resolveVerification(@Param('id') id: string, @Body() dto: ResolveDto) {
    return this.admin.resolveVerification(id, dto.approve);
  }

  @Get('refunds')
  refundQueue() {
    return this.admin.refundQueue();
  }

  @Post('refunds/:id')
  @HttpCode(HttpStatus.OK)
  resolveRefund(@Param('id') id: string, @Body() dto: ResolveDto) {
    return this.admin.resolveRefund(id, dto.approve);
  }

  @Get('reviews')
  latestReviews() {
    return this.admin.latestReviews();
  }

  @Delete('reviews/:id')
  deleteReview(@Param('id') id: string) {
    return this.admin.deleteReview(id);
  }
}
