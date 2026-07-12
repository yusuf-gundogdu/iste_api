import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Payments (e2e) — escrow akışı', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let proToken: string;
  let conversationId: string;
  let paymentId: string;
  const customerSub = 'test-kullanici-7';

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

    await prisma.user.deleteMany({ where: { providerSub: customerSub } });
    customerToken = await login(customerSub);

    const pro = await prisma.proProfile.findFirstOrThrow({
      where: { verificationStatus: 'VERIFIED', isPublished: true },
      include: { user: true },
    });
    proToken = await login(pro.user.providerSub);

    const conversation = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ proProfileId: pro.id })
      .expect(200);
    conversationId = (conversation.body as { id: string }).id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { providerSub: customerSub } });
    await app.close();
  });

  it('müşteri ödeme talebi oluşturamaz; usta oluşturur (%2 komisyon)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/request')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ conversationId, amount: 1000 })
      .expect(403);

    const res = await request(app.getHttpServer())
      .post('/api/v1/payments/request')
      .set('Authorization', `Bearer ${proToken}`)
      .send({ conversationId, amount: 1000, title: 'Kombi bakımı' })
      .expect(201);

    const body = res.body as {
      id: string;
      status: string;
      commissionAmount: number;
      netAmount: number;
      serviceStatus: string;
    };
    paymentId = body.id;
    expect(body.status).toBe('REQUESTED');
    expect(body.commissionAmount).toBe(20);
    expect(body.netAmount).toBe(980);
    expect(body.serviceStatus).toBe('PAYMENT_PENDING');
  });

  it('açık ödeme varken ikinci talep reddedilir', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/payments/request')
      .set('Authorization', `Bearer ${proToken}`)
      .send({ conversationId, amount: 500 })
      .expect(400);
  });

  it('checkout → fake 3DS onay → SECURED + hizmet SCHEDULED', async () => {
    const checkout = await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/checkout`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const { checkoutUrl } = checkout.body as { checkoutUrl: string };
    expect(checkoutUrl).toContain('fake-3ds');
    const ref = new URL(checkoutUrl, 'http://x').searchParams.get('ref')!;

    // 3DS sayfası render olur
    await request(app.getHttpServer()).get(checkoutUrl).expect(200);

    // ref'siz sahte callback durumu DEĞİŞTİREMEZ (güvenlik)
    await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}/callback?success=1`)
      .expect(200);
    const still = await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect((still.body as { status: string }).status).toBe('PROCESSING');

    // Doğru ref ile onay callback'i
    await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}/callback?success=1&ref=${ref}`)
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/payments/${paymentId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const body = detail.body as {
      status: string;
      serviceStatus: string;
      timeline: unknown[];
    };
    expect(body.status).toBe('SECURED');
    expect(body.serviceStatus).toBe('SCHEDULED');
    expect(body.timeline.length).toBeGreaterThanOrEqual(3);
  });

  it('hizmet tamamlanmadan release reddedilir; tamamlanınca aktarılır', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/release`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(400);

    // Usta işi ilerletir: SCHEDULED → IN_PROGRESS → COMPLETED
    for (const status of ['IN_PROGRESS', 'COMPLETED']) {
      await request(app.getHttpServer())
        .patch(`/api/v1/conversations/${conversationId}/service-record`)
        .set('Authorization', `Bearer ${proToken}`)
        .send({ status })
        .expect(200);
    }

    // Usta release edemez, müşteri eder
    await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/release`)
      .set('Authorization', `Bearer ${proToken}`)
      .expect(403);

    const res = await request(app.getHttpServer())
      .post(`/api/v1/payments/${paymentId}/release`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect((res.body as { status: string }).status).toBe('RELEASED');
  });

  it('başarısız 3DS ödemeyi FAILED yapar, sahte ödendi üretmez', async () => {
    // Yeni sohbet + talep (önceki tamamlandı)
    const pro2 = await prisma.proProfile
      .findFirstOrThrow({
        where: {
          verificationStatus: 'VERIFIED',
          isPublished: true,
          conversations: { none: { customerId: { not: '' } } },
        },
        include: { user: true },
      })
      .catch(async () => {
        // fallback: farklı bir usta
        return prisma.proProfile.findFirstOrThrow({
          where: { verificationStatus: 'VERIFIED', isPublished: true },
          orderBy: { createdAt: 'desc' },
          include: { user: true },
        });
      });

    const conversation = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ proProfileId: pro2.id })
      .expect(200);
    const convId = (conversation.body as { id: string }).id;

    const pro2Token = await login(pro2.user.providerSub);
    const paymentRes = await request(app.getHttpServer())
      .post('/api/v1/payments/request')
      .set('Authorization', `Bearer ${pro2Token}`)
      .send({ conversationId: convId, amount: 300 })
      .expect(201);
    const failPaymentId = (paymentRes.body as { id: string }).id;

    const failCheckout = await request(app.getHttpServer())
      .post(`/api/v1/payments/${failPaymentId}/checkout`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const failRef = new URL(
      (failCheckout.body as { checkoutUrl: string }).checkoutUrl,
      'http://x',
    ).searchParams.get('ref')!;
    await request(app.getHttpServer())
      .get(
        `/api/v1/payments/${failPaymentId}/callback?success=0&ref=${failRef}`,
      )
      .expect(200);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/payments/${failPaymentId}`)
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect((detail.body as { status: string }).status).toBe('FAILED');
  });

  it('ödeme listeleri iki tarafta görünür', async () => {
    const mine = await request(app.getHttpServer())
      .get('/api/v1/payments/mine')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect((mine.body as unknown[]).length).toBeGreaterThanOrEqual(2);

    // Ödeme özeti ekranı alanları (prototip pay): usta adı + kategori +
    // usta profil id'si her kayıtta döner.
    const first = (mine.body as Array<Record<string, unknown>>)[0];
    expect(typeof first.proName).toBe('string');
    expect(typeof first.categoryName).toBe('string');
    expect(typeof first.proProfileId).toBe('string');

    const pros = await request(app.getHttpServer())
      .get('/api/v1/payments/mine')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    expect((pros.body as unknown[]).length).toBeGreaterThanOrEqual(1);
  });
});
