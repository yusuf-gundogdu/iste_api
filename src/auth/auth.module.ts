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
      useFactory: () => {
        const hasKeys =
          process.env.GOOGLE_CLIENT_ID || process.env.APPLE_BUNDLE_ID;
        if (hasKeys) return new LiveSocialTokenVerifier();
        // Dev doğrulayıcısı üretimde ASLA devreye giremez — imzasız token
        // kabul eder; anahtarsız production açılışı bilinçli olarak durdurulur.
        if (process.env.NODE_ENV === 'production') {
          throw new Error(
            'Üretimde GOOGLE_CLIENT_ID / APPLE_BUNDLE_ID zorunludur — ' +
              'DevSocialTokenVerifier production ortamında kullanılamaz.',
          );
        }
        return new DevSocialTokenVerifier();
      },
    },
  ],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
