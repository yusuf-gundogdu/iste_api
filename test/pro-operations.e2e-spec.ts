import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Pro Operations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let proToken: string;

  const login = async (sub: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'GOOGLE',
        idToken: JSON.stringify({ sub, email: `${sub}@test.iste` }),
      })
      .expect(200);
    return (res.body as { accessToken: string }).accessToken;
  };

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

    // Sohbet geçmişi olan bir demo usta (S10-S14 testlerinden).
    const pro = await prisma.proProfile.findFirstOrThrow({
      where: { verificationStatus: 'VERIFIED', isPublished: true },
      include: { user: true },
    });
    proToken = await login(pro.user.providerSub);
  });

  afterAll(async () => {
    await app.close();
  });

  it('panel özeti alanları döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pros/me/dashboard')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    const body = res.body as {
      verificationStatus: string;
      monthEarnings: number;
      securedAmount: number;
      newConversations: number;
      activeJobs: number;
    };
    expect(body.verificationStatus).toBe('VERIFIED');
    expect(typeof body.monthEarnings).toBe('number');
    expect(typeof body.securedAmount).toBe('number');
    expect(typeof body.newConversations).toBe('number');
    expect(typeof body.activeJobs).toBe('number');
  });

  it('usta hizmet akışı müşteri adıyla döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pros/me/service-records')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    const items = res.body as Array<{
      customerName: string;
      status: string;
    }>;
    expect(Array.isArray(items)).toBe(true);
    if (items.length > 0) {
      expect(items[0].customerName).toBeTruthy();
      expect(items[0].status).toBeTruthy();
    }
  });

  it('kazanç özeti + ödeme kırılımı döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pros/me/earnings')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    const body = res.body as {
      summary: { transferred: number; secured: number; commission: number };
      payments: Array<{ netAmount: number; commissionAmount: number }>;
    };
    expect(typeof body.summary.transferred).toBe('number');
    expect(typeof body.summary.commission).toBe('number');
    expect(Array.isArray(body.payments)).toBe(true);
  });

  it('vitrini olmayan kullanıcı 404 alır', async () => {
    const stranger = await login('test-kullanici-10');
    await request(app.getHttpServer())
      .get('/api/v1/pros/me/dashboard')
      .set('Authorization', `Bearer ${stranger}`)
      .expect(404);
    await prisma.user.deleteMany({
      where: { providerSub: 'test-kullanici-10' },
    });
  });
});
