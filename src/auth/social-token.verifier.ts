import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { createRemoteJWKSet, jwtVerify } from 'jose';

export type SocialProvider = 'GOOGLE' | 'APPLE';

export interface SocialIdentity {
  sub: string;
  email?: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Google/Apple kimlik token doğrulayıcısı. Üretimde imza + audience
 * doğrulanır; GOOGLE_CLIENT_ID / APPLE_BUNDLE_ID env'leri zorunludur.
 */
export abstract class SocialTokenVerifier {
  abstract verify(
    provider: SocialProvider,
    idToken: string,
  ): Promise<SocialIdentity>;
}

@Injectable()
export class LiveSocialTokenVerifier extends SocialTokenVerifier {
  private readonly google = new OAuth2Client();
  private readonly appleJwks = createRemoteJWKSet(
    new URL('https://appleid.apple.com/auth/keys'),
  );

  async verify(
    provider: SocialProvider,
    idToken: string,
  ): Promise<SocialIdentity> {
    try {
      if (provider === 'GOOGLE') {
        // Audience tanımsızken doğrulama yapılmaz (herhangi bir uygulamanın
        // Google token'ı kabul edilirdi).
        if (!process.env.GOOGLE_CLIENT_ID) {
          throw new Error('GOOGLE_CLIENT_ID tanımsız');
        }
        const ticket = await this.google.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload?.sub) throw new Error('payload boş');
        return {
          sub: payload.sub,
          email: payload.email,
          firstName: payload.given_name,
          lastName: payload.family_name,
        };
      }

      if (!process.env.APPLE_BUNDLE_ID) {
        throw new Error('APPLE_BUNDLE_ID tanımsız');
      }
      const { payload } = await jwtVerify(idToken, this.appleJwks, {
        issuer: 'https://appleid.apple.com',
        audience: process.env.APPLE_BUNDLE_ID,
      });
      if (!payload.sub) throw new Error('payload boş');
      return {
        sub: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };
    } catch {
      throw new UnauthorizedException('Giriş doğrulanamadı · tekrar dene');
    }
  }
}

/**
 * Geliştirme doğrulayıcısı — YALNIZ env anahtarları yokken devreye girer.
 * Token, düz JSON kimlik nesnesi olarak kabul edilir (imza doğrulaması yok).
 */
@Injectable()
export class DevSocialTokenVerifier extends SocialTokenVerifier {
  private readonly logger = new Logger('DevAuth');

  verify(provider: SocialProvider, idToken: string): Promise<SocialIdentity> {
    try {
      const payload = JSON.parse(idToken) as SocialIdentity;
      if (!payload.sub) throw new Error('sub gerekli');
      this.logger.warn(
        `DEV girişi (${provider}/${payload.sub}) — üretimde GOOGLE_CLIENT_ID/APPLE_BUNDLE_ID tanımlayın`,
      );
      return Promise.resolve(payload);
    } catch {
      throw new UnauthorizedException('Giriş doğrulanamadı · tekrar dene');
    }
  }
}
