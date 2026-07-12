import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import sharp from 'sharp';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Uploads (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  const sub = 'test-kullanici-3';

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

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'GOOGLE',
        idToken: JSON.stringify({ sub, email: `${sub}@test.iste` }),
      })
      .expect(200);
    token = (login.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { providerSub: sub } });
    await app.close();
  });

  const pngBuffer = () =>
    sharp({
      create: {
        width: 1200,
        height: 800,
        channels: 3,
        background: { r: 255, g: 90, b: 44 },
      },
    })
      .png()
      .toBuffer();

  it('görsel yükler, webp olarak kaydeder ve /uploads yolu döner', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/uploads?kind=avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', await pngBuffer(), 'test.png')
      .expect(201);

    const { url } = res.body as { url: string };
    expect(url).toMatch(/^\/uploads\/avatar-[\w-]+\.webp$/);
  });

  it('görsel olmayan dosya reddedilir', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads?kind=avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('not an image'), 'not.txt')
      .expect(400);
  });

  it('token olmadan 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/uploads')
      .attach('file', await pngBuffer(), 'test.png')
      .expect(401);
  });

  it('avatar upload → PATCH /users/me ile profile bağlanır', async () => {
    const upload = await request(app.getHttpServer())
      .post('/api/v1/uploads?kind=avatar')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', await pngBuffer(), 'me.png')
      .expect(201);
    const { url } = upload.body as { url: string };

    const patched = await request(app.getHttpServer())
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ avatarUrl: url, firstName: 'Test' })
      .expect(200);

    const body = patched.body as { avatarUrl: string; firstName: string };
    expect(body.avatarUrl).toBe(url);
    expect(body.firstName).toBe('Test');
  });
});
