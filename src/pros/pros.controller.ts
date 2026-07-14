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
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
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

class UploadDocumentDto {
  @IsString()
  docType: string;

  @Matches(/^\/uploads\/[\w.-]+$/)
  url: string;
}

class CreateProServiceDto {
  @IsString()
  @MaxLength(80)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  priceType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAmount?: number;
}

class UpdateProServiceDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  priceType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAmount?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class AddRegionDto {
  @IsString()
  @MaxLength(60)
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  approxKm?: number;
}

class MaxDistanceDto {
  @IsNumber()
  @Min(1)
  maxDistanceKm: number;
}

class WorkingHourDto {
  @IsNumber()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @IsBoolean()
  isOpen: boolean;

  @IsString()
  opensAt: string;

  @IsString()
  closesAt: string;
}

class SetWorkingHoursDto {
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  hours: WorkingHourDto[];
}

class PatchProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  priceNote?: string;

  @IsOptional()
  @Matches(/^\/uploads\/[\w.-]+$/)
  coverUrl?: string;
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

  // ── Doğrulama belgeleri (prototip verification) ──
  @UseGuards(JwtAuthGuard)
  @Get('me/documents')
  myDocuments(@CurrentUser() user: JwtPayload) {
    return this.pros.myDocuments(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/documents')
  uploadDocument(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.pros.uploadDocument(user.sub, dto.docType, dto.url);
  }

  // ── Hizmetlerim & fiyatlar (prototip proServices) ──
  @UseGuards(JwtAuthGuard)
  @Get('me/services')
  myServices(@CurrentUser() user: JwtPayload) {
    return this.pros.myServices(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/services')
  createService(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateProServiceDto,
  ) {
    return this.pros.createService(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/services/:id')
  updateService(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateProServiceDto,
  ) {
    return this.pros.updateService(user.sub, id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/services/:id')
  deleteService(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pros.deleteService(user.sub, id);
  }

  // ── Hizmet bölgelerim (prototip proRegions) ──
  @UseGuards(JwtAuthGuard)
  @Get('me/regions')
  myRegions(@CurrentUser() user: JwtPayload) {
    return this.pros.myRegions(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/regions')
  addRegion(@CurrentUser() user: JwtPayload, @Body() dto: AddRegionDto) {
    return this.pros.addRegion(user.sub, dto.name, dto.approxKm);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('me/regions/:id')
  removeRegion(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.pros.removeRegion(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('me/max-distance')
  setMaxDistance(
    @CurrentUser() user: JwtPayload,
    @Body() dto: MaxDistanceDto,
  ) {
    return this.pros.setMaxDistance(user.sub, dto.maxDistanceKm);
  }

  // ── Çalışma saatleri (prototip availability) ──
  @UseGuards(JwtAuthGuard)
  @Put('me/working-hours')
  setWorkingHours(
    @CurrentUser() user: JwtPayload,
    @Body() dto: SetWorkingHoursDto,
  ) {
    return this.pros.setWorkingHours(user.sub, dto.hours);
  }

  // ── Profili düzenle (prototip editProfile) ──
  @UseGuards(JwtAuthGuard)
  @Put('me/profile')
  patchProfile(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PatchProfileDto,
  ) {
    return this.pros.patchProfile(user.sub, dto);
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
