import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { BadRequestException, HttpException } from '@nestjs/common';
import { AuthService, normalizePhone } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { SmsSender } from './sms.sender';
import { createHash } from 'crypto';

const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

describe('normalizePhone', () => {
  it.each([
    ['05321234567', '+905321234567'],
    ['+905321234567', '+905321234567'],
    ['5321234567', '+905321234567'],
    ['0532 123 45 67', '+905321234567'],
  ])('%s → %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});

describe('AuthService', () => {
  let service: AuthService;
  const sentCodes: Array<{ phone: string; code: string }> = [];

  const prismaMock = {
    otpCode: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({}),
      findFirst: jest.fn(),
      update: jest.fn().mockResolvedValue({}),
    },
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    sentCodes.length = 0;
    prismaMock.otpCode.count.mockResolvedValue(0);

    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: SmsSender,
          useValue: {
            sendOtp: (phone: string, code: string) => {
              sentCodes.push({ phone, code });
              return Promise.resolve();
            },
          },
        },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('requestOtp 6 haneli kod üretir ve SMS gönderir', async () => {
    const result = await service.requestOtp('05321234567');

    expect(result.expiresInSeconds).toBe(180);
    expect(sentCodes).toHaveLength(1);
    expect(sentCodes[0].phone).toBe('+905321234567');
    expect(sentCodes[0].code).toMatch(/^\d{6}$/);
    expect(prismaMock.otpCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        phone: '+905321234567',
        codeHash: sha256(sentCodes[0].code),
      }) as Record<string, unknown>,
    });
  });

  it('requestOtp pencere limitini aşınca 429 fırlatır', async () => {
    prismaMock.otpCode.count.mockResolvedValue(5);

    await expect(service.requestOtp('05321234567')).rejects.toThrow(
      HttpException,
    );
    expect(sentCodes).toHaveLength(0);
  });

  it('verifyOtp doğru kodla yeni kullanıcı yaratır ve token döner', async () => {
    prismaMock.otpCode.findFirst.mockResolvedValue({
      id: 'otp1',
      attempts: 0,
      codeHash: sha256('123456'),
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'u1',
      isAdmin: false,
    });

    const result = await service.verifyOtp('05321234567', '123456');

    expect(result.isNewUser).toBe(true);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toHaveLength(96);
    expect(prismaMock.otpCode.update).toHaveBeenCalledWith({
      where: { id: 'otp1' },
      data: { consumedAt: expect.any(Date) as Date },
    });
  });

  it('verifyOtp yanlış kodda deneme sayar ve hata fırlatır', async () => {
    prismaMock.otpCode.findFirst.mockResolvedValue({
      id: 'otp1',
      attempts: 0,
      codeHash: sha256('123456'),
    });

    await expect(service.verifyOtp('05321234567', '000000')).rejects.toThrow(
      BadRequestException,
    );
    expect(prismaMock.otpCode.update).toHaveBeenCalledWith({
      where: { id: 'otp1' },
      data: { attempts: { increment: 1 } },
    });
  });

  it('verifyOtp süresi dolmuş/olmayan kodda hata fırlatır', async () => {
    prismaMock.otpCode.findFirst.mockResolvedValue(null);

    await expect(service.verifyOtp('05321234567', '123456')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('refresh geçerli token ile rotasyon yapar', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      expiresAt: new Date(Date.now() + 10_000),
      user: { id: 'u1', isAdmin: false },
    });

    const result = await service.refresh('a'.repeat(96));

    expect(result.accessToken).toBeTruthy();
    expect(prismaMock.refreshToken.delete).toHaveBeenCalledWith({
      where: { id: 'rt1' },
    });
    expect(prismaMock.refreshToken.create).toHaveBeenCalled();
  });

  it('refresh süresi dolmuş token ile 401 fırlatır', async () => {
    prismaMock.refreshToken.findUnique.mockResolvedValue({
      id: 'rt1',
      expiresAt: new Date(Date.now() - 10_000),
      user: { id: 'u1', isAdmin: false },
    });

    await expect(service.refresh('a'.repeat(96))).rejects.toThrow(
      'Oturumun sona erdi · tekrar giriş yap',
    );
  });
});
