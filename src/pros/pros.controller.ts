import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { ProsService } from './pros.service';
import { DiscoverQueryDto } from './dto/discover-query.dto';
import { UpsertProProfileDto } from './dto/upsert-pro-profile.dto';

class AddGalleryImageDto {
  @Matches(/^\/uploads\/[\w.-]+$/)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}

class SetOnlineDto {
  @IsBoolean()
  isOnline: boolean;
}

class BankAccountDto {
  @IsString()
  @MaxLength(60)
  bankName: string;

  @Matches(/^TR\d{24}$/)
  iban: string;
}

class CreatePayoutDto {
  @IsNumber()
  @Min(1)
  amount: number;
}

@Controller('pros')
export class ProsController {
  constructor(private readonly pros: ProsService) {}

  /** Herkese açık: konuma göre usta keşfi. */
  @Get('discover')
  discover(@Query() query: DiscoverQueryDto) {
    return this.pros.discover(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMine(@CurrentUser() user: JwtPayload) {
    return this.pros.getMine(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/dashboard')
  myDashboard(@CurrentUser() user: JwtPayload) {
    return this.pros.myDashboard(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/service-records')
  myServiceRecords(@CurrentUser() user: JwtPayload) {
    return this.pros.myServiceRecords(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/earnings')
  myEarnings(@CurrentUser() user: JwtPayload) {
    return this.pros.myEarnings(user.sub);
  }

  /** Panel çevrimiçi/çevrimdışı toggle'ı (prototip). */
  @UseGuards(JwtAuthGuard)
  @Put('me/online')
  setOnline(@CurrentUser() user: JwtPayload, @Body() dto: SetOnlineDto) {
    return this.pros.setOnline(user.sub, dto.isOnline);
  }

  /** Aktarım hesabı (prototip payoutReq banka satırı). */
  @UseGuards(JwtAuthGuard)
  @Put('me/bank-account')
  setBankAccount(
    @CurrentUser() user: JwtPayload,
    @Body() dto: BankAccountDto,
  ) {
    return this.pros.setBankAccount(user.sub, dto.bankName, dto.iban);
  }

  /** Banka hesabına aktarım talebi (prototip payouts). */
  @UseGuards(JwtAuthGuard)
  @Post('me/payouts')
  createPayout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePayoutDto,
  ) {
    return this.pros.createPayout(user.sub, dto.amount);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me')
  upsertMine(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertProProfileDto,
  ) {
    return this.pros.upsertMine(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/submit')
  @HttpCode(HttpStatus.OK)
  submitMine(@CurrentUser() user: JwtPayload) {
    return this.pros.submitMine(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/gallery')
  addGalleryImage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddGalleryImageDto,
  ) {
    return this.pros.addGalleryImage(user.sub, dto.url, dto.title);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/gallery/:id')
  removeGalleryImage(
    @CurrentUser() user: JwtPayload,
    @Param('id') imageId: string,
  ) {
    return this.pros.removeGalleryImage(user.sub, imageId);
  }

  /** Herkese açık usta profili — en sonda ('me'/'discover' ile çakışmasın). */
  @Get(':id')
  getPublicProfile(@Param('id') id: string) {
    return this.pros.getPublicProfile(id);
  }
}
