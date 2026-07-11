import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { ReviewsService } from './reviews.service';

class CreateReviewDto {
  @IsUUID()
  conversationId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  communication?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  punctuality?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  workmanship?: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  body?: string;
}

class ReplyDto {
  @IsString()
  @MinLength(2)
  @MaxLength(600)
  body: string;
}

@Controller()
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('reviews')
  create(@CurrentUser() user: JwtPayload, @Body() dto: CreateReviewDto) {
    return this.reviews.create(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reviews/:id/reply')
  reply(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: ReplyDto,
  ) {
    return this.reviews.reply(user.sub, id, dto.body);
  }

  /** Herkese açık: usta profili yorumları. */
  @Get('pros/:id/reviews')
  byPro(
    @Param('id') proProfileId: string,
    @Query('verified') verified?: string,
  ) {
    return this.reviews.byPro(proProfileId, verified === 'true');
  }
}
