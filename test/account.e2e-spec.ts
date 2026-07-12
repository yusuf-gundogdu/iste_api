import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Account (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  let proProfileId: string;
  const sub = 'test-kullanici-9';

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

    const pro = await prisma.proProfile.findFirstOrThrow({
      where: { verificationStatus: 'VERIFIED', isPublished: true },
    });
    proProfileId = pro.id;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { providerSub: sub } });
    await app.close();
  });

  it('favori ekle/listele/çıkar', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/favorites/${proProfileId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = list.body as Array<{ id: string; displayName: string }>;
    expect(items.some((f) => f.id === proProfileId)).toBe(true);

    const ids = await request(app.getHttpServer())
      .get('/api/v1/favorites/ids')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(ids.body as string[]).toContain(proProfileId);

    await request(app.getHttpServer())
      .delete(`/api/v1/favorites/${proProfileId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const after = await request(app.getHttpServer())
      .get('/api/v1/favorites')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((after.body as unknown[]).length).toBe(0);
  });

  it('adres CRUD + sahiplik koruması', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/addresses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Ev',
        city: 'İstanbul',
        district: 'Kadıköy',
        fullText: 'Moda Cad. No:1 D:2',
      })
      .expect(201);
    const addressId = (created.body as { id: string }).id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/addresses')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect((list.body as unknown[]).length).toBe(1);

    await request(app.getHttpServer())
      .delete(`/api/v1/addresses/${addressId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });

  it('işlem geçmişi hizmet kayıtlarını hasReview ile döner', async () => {
    const conversation = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${token}`)
      .send({ proProfileId })
      .expect(200);
    void conversation;

    const res = await request(app.getHttpServer())
      .get('/api/v1/service-records/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const items = res.body as Array<{
      status: string;
      hasReview: boolean;
      proName: string;
    }>;
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items[0].status).toBe('DISCUSSING');
    expect(items[0].hasReview).toBe(false);
    expect(items[0].proName).toBeTruthy();
  });

  it('değerlendirmelerim boşken boş liste', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/reviews/mine')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body).toEqual([]);
  });
});
