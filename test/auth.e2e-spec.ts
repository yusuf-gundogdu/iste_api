import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Auth (e2e) — Google/Apple girişi', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  const sub = 'test-kullanici-1';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.user.deleteMany({ where: { providerSub: sub } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { providerSub: sub } });
    await app.close();
  });

  it('geçersiz sağlayıcı 400 döner', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({ provider: 'FACEBOOK', idToken: 'x'.repeat(20) })
      .expect(400);
  });

  it('bozuk token 401 döner', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({ provider: 'GOOGLE', idToken: 'bozuk-token-payload' })
      .expect(401);
  });

  it('Google girişi: ilk giriş kullanıcı yaratır, sonraki aynı hesaba döner', async () => {
    const idToken = JSON.stringify({
      sub,
      email: 'test@iste.app',
      firstName: 'Test',
    });

    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({ provider: 'GOOGLE', idToken })
      .expect(200);
    const tokens = first.body as {
      accessToken: string;
      refreshToken: string;
      isNewUser: boolean;
    };
    expect(tokens.isNewUser).toBe(true);
    expect(tokens.accessToken).toBeTruthy();

    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({ provider: 'GOOGLE', idToken })
      .expect(200);
    expect((second.body as { isNewUser: boolean }).isNewUser).toBe(false);

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokens.accessToken}`)
      .expect(200);
    expect((me.body as { email: string }).email).toBe('test@iste.app');

    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(200);
    expect((refreshed.body as { refreshToken: string }).refreshToken).not.toBe(
      tokens.refreshToken,
    );

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: tokens.refreshToken })
      .expect(401);
  });

  it('aynı sub farklı sağlayıcıda ayrı hesaptır', async () => {
    const apple = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({ provider: 'APPLE', idToken: JSON.stringify({ sub }) })
      .expect(200);
    expect((apple.body as { isNewUser: boolean }).isNewUser).toBe(true);
    await prisma.user.deleteMany({
      where: { provider: 'APPLE', providerSub: sub },
    });
  });
});
