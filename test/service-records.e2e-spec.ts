import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('ServiceRecords (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let proToken: string;
  let conversationId: string;
  const customerSub = 'test-kullanici-6';

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

  const url = () => `/api/v1/conversations/${conversationId}/service-record`;

  it('sohbetle birlikte DISCUSSING kaydı oluşur', async () => {
    const res = await request(app.getHttpServer())
      .get(url())
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    expect((res.body as { status: string }).status).toBe('DISCUSSING');
  });

  it('müşteri hizmet detayını düzenleyemez; usta düzenler', async () => {
    await request(app.getHttpServer())
      .patch(url())
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ title: 'Klima montajı' })
      .expect(403);

    const res = await request(app.getHttpServer())
      .patch(url())
      .set('Authorization', `Bearer ${proToken}`)
      .send({ title: 'Klima montajı', agreedAmount: 1500 })
      .expect(200);
    const body = res.body as { title: string; agreedAmount: number };
    expect(body.title).toBe('Klima montajı');
    expect(body.agreedAmount).toBe(1500);
  });

  it('durum makinesi: geçerli zincir ilerler, geçersiz atlama reddedilir', async () => {
    // DISCUSSING → IN_PROGRESS atlaması yasak
    await request(app.getHttpServer())
      .patch(url())
      .set('Authorization', `Bearer ${proToken}`)
      .send({ status: 'IN_PROGRESS' })
      .expect(400);

    // Müşteri SCHEDULED yapamaz
    await request(app.getHttpServer())
      .patch(url())
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ status: 'SCHEDULED' })
      .expect(403);

    for (const status of ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']) {
      const res = await request(app.getHttpServer())
        .patch(url())
        .set('Authorization', `Bearer ${proToken}`)
        .send({ status })
        .expect(200);
      expect((res.body as { status: string }).status).toBe(status);
    }

    // COMPLETED son duraktır
    await request(app.getHttpServer())
      .patch(url())
      .set('Authorization', `Bearer ${proToken}`)
      .send({ status: 'CANCELLED' })
      .expect(400);
  });

  it('sohbet listesi hizmet durumunu taşır', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`)
      .expect(200);
    const conversation = (
      res.body as Array<{
        id: string;
        serviceRecord: { status: string } | null;
      }>
    ).find((c) => c.id === conversationId);
    expect(conversation?.serviceRecord?.status).toBe('COMPLETED');
  });
});
