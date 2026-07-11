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
  UseGuards,
} from '@nestjs/common';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { ProsService } from './pros.service';
import { UpsertProProfileDto } from './dto/upsert-pro-profile.dto';

class AddGalleryImageDto {
  @Matches(/^\/uploads\/[\w.-]+$/)
  url: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  title?: string;
}

@Controller('pros')
@UseGuards(JwtAuthGuard)
export class ProsController {
  constructor(private readonly pros: ProsService) {}

  @Get('me')
  getMine(@CurrentUser() user: JwtPayload) {
    return this.pros.getMine(user.sub);
  }

  @Put('me')
  upsertMine(
    @CurrentUser() user: JwtPayload,
    @Body() dto: UpsertProProfileDto,
  ) {
    return this.pros.upsertMine(user.sub, dto);
  }

  @Post('me/submit')
  @HttpCode(HttpStatus.OK)
  submitMine(@CurrentUser() user: JwtPayload) {
    return this.pros.submitMine(user.sub);
  }

  @Post('me/gallery')
  addGalleryImage(
    @CurrentUser() user: JwtPayload,
    @Body() dto: AddGalleryImageDto,
  ) {
    return this.pros.addGalleryImage(user.sub, dto.url, dto.title);
  }

  @Delete('me/gallery/:id')
  removeGalleryImage(
    @CurrentUser() user: JwtPayload,
    @Param('id') imageId: string,
  ) {
    return this.pros.removeGalleryImage(user.sub, imageId);
  }
}
