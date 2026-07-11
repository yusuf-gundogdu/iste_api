import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsSender } from './sms.sender';

const OTP_TTL_MS = 3 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;
const OTP_REQUEST_LIMIT = 5; // 10 dakikada aynı numaraya en çok 5 kod
const OTP_REQUEST_WINDOW_MS = 10 * 60 * 1000;
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

/** +905XXXXXXXXX kanonik biçimine çevirir. */
export const normalizePhone = (raw: string): string => {
  const digits = raw.replace(/\D/g, '');
  const national = digits.startsWith('90')
    ? digits.slice(2)
    : digits.startsWith('0')
      ? digits.slice(1)
      : digits;
  return `+90${national}`;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly sms: SmsSender,
  ) {}

  async requestOtp(rawPhone: string): Promise<{ expiresInSeconds: number }> {
    const phone = normalizePhone(rawPhone);

    const recentCount = await this.prisma.otpCode.count({
      where: {
        phone,
        createdAt: { gte: new Date(Date.now() - OTP_REQUEST_WINDOW_MS) },
      },
    });
    if (recentCount >= OTP_REQUEST_LIMIT) {
      throw new HttpException(
        'Çok fazla kod istedin · birkaç dakika sonra tekrar dene',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.otpCode.create({
      data: {
        phone,
        codeHash: sha256(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });
    await this.sms.sendOtp(phone, code);

    return { expiresInSeconds: OTP_TTL_MS / 1000 };
  }

  async verifyOtp(
    rawPhone: string,
    code: string,
  ): Promise<AuthTokens & { isNewUser: boolean }> {
    const phone = normalizePhone(rawPhone);

    const otp = await this.prisma.otpCode.findFirst({
      where: { phone, consumedAt: null, expiresAt: { gte: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) {
      throw new BadRequestException('Kodun süresi dolmuş · yeni kod iste');
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Çok fazla hatalı deneme · yeni kod iste');
    }
    if (otp.codeHash !== sha256(code)) {
      await this.prisma.otpCode.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Kod hatalı · tekrar dene');
    }

    await this.prisma.otpCode.update({
      where: { id: otp.id },
      data: { consumedAt: new Date() },
    });

    const existing = await this.prisma.user.findUnique({ where: { phone } });
    const user =
      existing ?? (await this.prisma.user.create({ data: { phone } }));

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
        phone: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
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
