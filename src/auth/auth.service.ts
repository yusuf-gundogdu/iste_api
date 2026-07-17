import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SocialProvider, SocialTokenVerifier } from './social-token.verifier';

const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface JwtPayload {
  sub: string;
  isAdmin: boolean;
}

const sha256 = (value: string) =>
  createHash('sha256').update(value).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly verifier: SocialTokenVerifier,
  ) {}

  /** Google/Apple kimliğiyle giriş — kullanıcı yoksa oluşturulur. */
  async socialLogin(
    provider: SocialProvider,
    idToken: string,
  ): Promise<AuthTokens & { isNewUser: boolean }> {
    const identity = await this.verifier.verify(provider, idToken);

    const existing = await this.prisma.user.findUnique({
      where: {
        provider_providerSub: { provider, providerSub: identity.sub },
      },
    });
    const user =
      existing ??
      (await this.prisma.user.create({
        data: {
          provider,
          providerSub: identity.sub,
          email: identity.email,
          firstName: identity.firstName,
          lastName: identity.lastName,
        },
      }));

    const tokens = await this.issueTokens(user.id, user.isAdmin);
    return { ...tokens, isNewUser: !existing };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = sha256(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Oturumun sona erdi · tekrar giriş yap');
    }

    // Rotasyon: eski token tek kullanımlıktır.
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issueTokens(stored.user.id, stored.user.isAdmin);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        isAdmin: true,
        createdAt: true,
      },
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }

  private async issueTokens(
    userId: string,
    isAdmin: boolean,
  ): Promise<AuthTokens> {
    const payload: JwtPayload = { sub: userId, isAdmin };
    const accessToken = await this.jwt.signAsync(payload);

    const refreshToken = randomBytes(48).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: sha256(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
      },
    });

    return { accessToken, refreshToken };
  }
}
