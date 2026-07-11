import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsString, Length, MaxLength } from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { AccountService } from './account.service';

class CreateAddressDto {
  @IsString()
  @Length(1, 40)
  title: string;

  @IsString()
  @Length(2, 60)
  city: string;

  @IsString()
  @MaxLength(60)
  district: string;

  @IsString()
  @Length(5, 300)
  fullText: string;
}

@Controller()
@UseGuards(JwtAuthGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('service-records/mine')
  myTransactions(@CurrentUser() user: JwtPayload) {
    return this.account.myTransactions(user.sub);
  }

  @Get('favorites')
  listFavorites(@CurrentUser() user: JwtPayload) {
    return this.account.listFavorites(user.sub);
  }

  @Get('favorites/ids')
  favoriteIds(@CurrentUser() user: JwtPayload) {
    return this.account.favoriteIds(user.sub);
  }

  @Post('favorites/:proProfileId')
  addFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('proProfileId') proProfileId: string,
  ) {
    return this.account.addFavorite(user.sub, proProfileId);
  }

  @Delete('favorites/:proProfileId')
  removeFavorite(
    @CurrentUser() user: JwtPayload,
    @Param('proProfileId') proProfileId: string,
  ) {
    return this.account.removeFavorite(user.sub, proProfileId);
  }

  @Get('addresses')
  listAddresses(@CurrentUser() user: JwtPayload) {
    return this.account.listAddresses(user.sub);
  }

  @Post('addresses')
  createAddress(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateAddressDto,
  ) {
    return this.account.createAddress(user.sub, dto);
  }

  @Delete('addresses/:id')
  deleteAddress(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.account.deleteAddress(user.sub, id);
  }

  @Get('reviews/mine')
  myReviews(@CurrentUser() user: JwtPayload) {
    return this.account.myReviews(user.sub);
  }
}
