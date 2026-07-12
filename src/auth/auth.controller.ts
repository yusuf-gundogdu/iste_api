import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn, IsString, MinLength } from 'class-validator';
import { AuthService } from './auth.service';
import type { JwtPayload } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CurrentUser, JwtAuthGuard } from './jwt-auth.guard';

class SocialLoginDto {
  @IsIn(['GOOGLE', 'APPLE'])
  provider: 'GOOGLE' | 'APPLE';

  @IsString()
  @MinLength(10)
  idToken: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('social')
  @HttpCode(HttpStatus.OK)
  socialLogin(@Body() dto: SocialLoginDto) {
    return this.auth.socialLogin(dto.provider, dto.idToken);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: JwtPayload) {
    return this.auth.me(user.sub);
  }
}
