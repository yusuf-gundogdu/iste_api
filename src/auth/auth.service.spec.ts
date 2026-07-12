import { Test } from '@nestjs/testing';
import { JwtModule } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  DevSocialTokenVerifier,
  SocialTokenVerifier,
} from './social-token.verifier';

describe('AuthService (social)', () => {
  let service: AuthService;

  const prismaMock = {
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
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: SocialTokenVerifier, useClass: DevSocialTokenVerifier },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('yeni Google kullanıcısı oluşturur ve token döner', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({ id: 'u1', isAdmin: false });

    const result = await service.socialLogin(
      'GOOGLE',
      JSON.stringify({ sub: 'g-1', email: 'a@b.c', firstName: 'Ali' }),
    );

    expect(result.isNewUser).toBe(true);
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toHaveLength(96);
    expect(prismaMock.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider: 'GOOGLE',
        providerSub: 'g-1',
        email: 'a@b.c',
      }) as Record<string, unknown>,
    });
  });

  it('mevcut kullanıcıda isNewUser=false, yeni kayıt açılmaz', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'u1',
      isAdmin: false,
    });

    const result = await service.socialLogin(
      'APPLE',
      JSON.stringify({ sub: 'a-1' }),
    );

    expect(result.isNewUser).toBe(false);
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it('geçersiz token 401 fırlatır', async () => {
    await expect(service.socialLogin('GOOGLE', 'bozuk')).rejects.toThrow(
      UnauthorizedException,
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
