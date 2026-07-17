import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { SupportService } from './support.service';

class CreateSupportTicketDto {
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  subject: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message: string;

  @IsOptional()
  @Matches(/^\/uploads\/[\w.-]+$/)
  imageUrl?: string;
}

/** Müşteri tarafı destek uçları. */
@Controller('support')
@UseGuards(JwtAuthGuard)
export class SupportController {
  constructor(private readonly support: SupportService) {}

  @Post()
  create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.support.create(user.sub, dto);
  }

  @Get('me')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.support.listMine(user.sub);
  }
}
