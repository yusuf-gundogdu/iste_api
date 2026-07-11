import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { ProsService } from './pros.service';
import { UpsertProProfileDto } from './dto/upsert-pro-profile.dto';

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
}
