import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { SmsSender } from './../src/auth/sms.sender';

/** Test içinde gönderilen son OTP kodunu yakalar. */
class CapturingSmsSender extends SmsSender {
  lastCode = '';
  sendOtp(_phone: string, code: string): Promise<void> {
    this.lastCode = code;
    return Promise.resolve();
  }
}

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const sms = new CapturingSmsSender();
  const phone = '+905009990001';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SmsSender)
      .useValue(sms)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { phone } });
    await prisma.otpCode.deleteMany({ where: { phone } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone } });
    await prisma.otpCode.deleteMany({ where: { phone } });
    await app.close();
  });

  it('geçersiz telefon 400 döner', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone: '12345' })
      .expect(400);
  });

  it('OTP iste → yanlış kod 400 → doğru kod token döner → me çalışır → refresh rotasyonu', async () => {
    // 1. Kod iste
    const reqRes = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone })
      .expect(200);
    expect((reqRes.body as { expiresInSeconds: number }).expiresInSeconds).toBe(
      180,
    );
    expect(sms.lastCode).toMatch(/^\d{6}$/);

    // 2. Yanlış kod reddedilir
    const wrongCode = sms.lastCode === '000000' ? '111111' : '000000';
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: wrongCode })
      .expect(400);

    // 3. Doğru kod token verir
    const verifyRes = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: sms.lastCode })
      .expect(200);
    const tokens = verifyRes.body as {
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
    };
    expect(tokens.isNewUser).toBe(true);
    expect(tokens.accessToken).toBeTruthy();

    // 4. Aynı kod ikinci kez kullanılamaz (tek kullanımlık)
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: sms.lastCode })
      .expect(400);

    // 5. me korumalı endpoint çalışır
    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
    expect((meRes.body as { phone: string }).phone).toBe(phone);

    // 6. Token'sız me 401
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    // 7. Refresh rotasyonu: yeni çift gelir, eski refresh artık geçersiz
    const refreshRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);
    const rotated = refreshRes.body as { refreshToken: string };
    expect(rotated.refreshToken).not.toBe(tokens.refreshToken);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);
  });
});
