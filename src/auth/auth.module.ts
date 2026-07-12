import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import {
  DevSocialTokenVerifier,
  LiveSocialTokenVerifier,
  SocialTokenVerifier,
} from './social-token.verifier';

@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_ACCESS_TTL', '15m') },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    {
      provide: SocialTokenVerifier,
      useClass:
        process.env.GOOGLE_CLIENT_ID || process.env.APPLE_BUNDLE_ID
          ? LiveSocialTokenVerifier
          : DevSocialTokenVerifier,
    },
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
