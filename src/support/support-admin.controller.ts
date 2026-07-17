import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { AdminGuard } from '../admin/admin.guard';
import { SupportService } from './support.service';

const STATUSES = [
  'OPEN',
  'IN_PROGRESS',
  'RESOLVED',
  'UNRESOLVED',
  'CLOSED',
] as const;
type SupportStatus = (typeof STATUSES)[number];

class UpdateSupportTicketDto {
  @IsIn(STATUSES)
  status: SupportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  adminNote?: string;
}

/** Yönetim tarafı destek uçları — AdminGuard korumalı. */
@Controller('admin/support')
@UseGuards(AdminGuard)
export class SupportAdminController {
  constructor(private readonly support: SupportService) {}

  @Get()
  listAll(@Query('status') status?: string) {
    const valid = (STATUSES as readonly string[]).includes(status ?? '')
      ? (status as SupportStatus)
      : undefined;
    return this.support.listAll(valid);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateSupportTicketDto) {
    return this.support.updateStatus(id, dto);
  }
}
