import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Reviews (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let proToken: string;
  let conversationId: string;
  let proProfileId: string;
  const customerSub = 'test-kullanici-8';

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

    // Yorumsuz temiz bir usta seç (Nakliyat demo ustası).
    const pro = await prisma.proProfile.findFirstOrThrow({
      where: {
        verificationStatus: 'VERIFIED',
        isPublished: true,
        user: { providerSub: 'demo-usta-12' },
      },
      include: { user: true },
    });
    proProfileId = pro.id;
    proToken = await login(pro.user.providerSub);

    const conversation = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ proProfileId: pro.id })
      .expect(200);
    conversationId = (conversation.body as { id: string }).id;
  });

  afterAll(async () => {
    await prisma.review.deleteMany({ where: { proProfileId } });
    await prisma.user.deleteMany({ where: { providerSub: customerSub } });
    await app.close();
  });

  it('tamamlanmadan yorum bırakılamaz', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ conversationId, rating: 5 })
      .expect(400);
  });

  it('hizmet tamamlanınca müşteri yorum bırakır (ödemesiz → doğrulanmamış)', async () => {
    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']) {
      await request(app.getHttpServer())
        .patch(`/api/v1/conversations/${conversationId}/service-record`)
        .set('Authorization', `Bearer ${proToken}`)
        .send({ status })
        .expect(200);
    }

    const res = await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        conversationId,
        rating: 5,
        communication: 5,
        punctuality: 4,
        workmanship: 5,
        body: 'Çok ilgiliydi, işini titiz yaptı.',
      })
      .expect(201);

    const body = res.body as { isVerified: boolean; rating: number };
    expect(body.rating).toBe(5);
    expect(body.isVerified).toBe(false); // ödeme yoktu

    // İkinci yorum reddedilir
    await request(app.getHttpServer())
      .post('/api/v1/reviews')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ conversationId, rating: 4 })
      .expect(400);
  });

  it('usta yanıt verir; profil yorum motoru özet döner', async () => {
    const list = await request(app.getHttpServer())
      .get(`/api/v1/pros/${proProfileId}/reviews`)
      .expect(200);
    const listBody = list.body as {
      summary: { average: number; total: number; verifiedCount: number };
      reviews: Array<{ id: string; customerName: string }>;
    };
    expect(listBody.summary.total).toBe(1);
    expect(listBody.summary.average).toBe(5);
    expect(listBody.reviews[0].customerName).toBeTruthy();

    await request(app.getHttpServer())
      .post(`/api/v1/reviews/${listBody.reviews[0].id}/reply`)
      .set('Authorization', `Bearer ${proToken}`)
      .send({ body: 'Teşekkürler, yine bekleriz!' })
      .expect(201);

    // Müşteri yanıt veremez (403) — farklı yorum olmadığından kendi yorumuna dener
    await request(app.getHttpServer())
      .post(`/api/v1/reviews/${listBody.reviews[0].id}/reply`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ body: 'ben de yanıt' })
      .expect(403);
  });

  it('discover puanı taşır', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pros/discover?lat=40.9357&lng=29.1310&radiusKm=3')
      .expect(200);
    const item = (
      res.body as Array<{
        id: string;
        ratingAvg: number | null;
        reviewCount: number;
      }>
    ).find((p) => p.id === proProfileId);
    expect(item?.ratingAvg).toBe(5);
    expect(item?.reviewCount).toBe(1);
  });
});
