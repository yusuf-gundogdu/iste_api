import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';
import { SmsSender } from './../src/auth/sms.sender';

class CapturingSmsSender extends SmsSender {
  lastCode = '';
  sendOtp(_phone: string, code: string): Promise<void> {
    this.lastCode = code;
    return Promise.resolve();
  }
}

describe('Notifications (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let proToken: string;
  let proUserId: string;
  const customerPhone = '+905009990011';
  const sms = new CapturingSmsSender();

  const login = async (phone: string) => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone })
      .expect(200);
    const verify = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: sms.lastCode })
      .expect(200);
    return (verify.body as { accessToken: string }).accessToken;
  };

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

    await prisma.user.deleteMany({ where: { phone: customerPhone } });
    customerToken = await login(customerPhone);

    // Sohbeti olmayan usta seç (çilingir demo).
    const pro = await prisma.proProfile.findFirstOrThrow({
      where: {
        verificationStatus: 'VERIFIED',
        isPublished: true,
        user: { phone: '+905550000011' },
      },
      include: { user: true },
    });
    proUserId = pro.user.id;
    await prisma.notification.deleteMany({ where: { userId: proUserId } });
    proToken = await login(pro.user.phone);

    // Yeni sohbet → ustaya bildirim düşer.
    await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ proProfileId: pro.id })
      .expect(200);
  });

  afterAll(async () => {
    await prisma.notification.deleteMany({ where: { userId: proUserId } });
    await prisma.user.deleteMany({ where: { phone: customerPhone } });
    await app.close();
  });

  it('yeni sohbet ustaya bildirim üretir; okunmamış sayacı doğru', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    const items = list.body as Array<{ type: string; title: string }>;
    expect(items.some((n) => n.type === 'NEW_CONVERSATION')).toBe(true);

    const count = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    expect((count.body as { count: number }).count).toBeGreaterThanOrEqual(1);
  });

  it('read-all sonrası okunmamış sıfırlanır', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/notifications/read-all')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(201);

    const count = await request(app.getHttpServer())
      .get('/api/v1/notifications/unread-count')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    expect((count.body as { count: number }).count).toBe(0);
  });

  it('müşterinin bildirim listesi kendi bildirimleriyle sınırlı', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const items = list.body as Array<{ type: string }>;
    expect(items.every((n) => n.type !== 'NEW_CONVERSATION')).toBe(true);
  });
});
