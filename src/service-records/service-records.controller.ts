import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { ServiceRecordsService } from './service-records.service';

class UpdateServiceRecordDto {
  @IsOptional()
  @IsIn([
    'DISCUSSING',
    'PAYMENT_PENDING',
    'SCHEDULED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
  ])
  status?:
    | 'DISCUSSING'
    | 'PAYMENT_PENDING'
    | 'SCHEDULED'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  agreedAmount?: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  address?: string;
}

@Controller('conversations/:conversationId/service-record')
@UseGuards(JwtAuthGuard)
export class ServiceRecordsController {
  constructor(private readonly records: ServiceRecordsService) {}

  @Get()
  get(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string,
  ) {
    return this.records.byConversation(conversationId, user.sub);
  }

  @Patch()
  update(
    @CurrentUser() user: JwtPayload,
    @Param('conversationId') conversationId: string,
    @Body() dto: UpdateServiceRecordDto,
  ) {
    return this.records.update(conversationId, user.sub, dto);
  }
}
