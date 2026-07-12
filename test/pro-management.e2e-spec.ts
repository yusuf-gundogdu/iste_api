import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Usta yönetim ekranları uçları (prototip 37–43):
 * belgeler · hizmet/fiyat kartları · bölgeler + maks mesafe ·
 * çalışma saatleri · profil PATCH.
 */
describe('Pro management (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  const sub = 'test-pro-yonetim';

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

    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: 'klima' },
    });
    const user = await prisma.user.findUniqueOrThrow({
      where: {
        provider_providerSub: { provider: 'GOOGLE', providerSub: sub },
      },
    });
    await prisma.proProfile.create({
      data: {
        userId: user.id,
        mainCategoryId: category.id,
        city: 'İstanbul',
        district: 'Kadıköy',
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { providerSub: sub } });
    await app.close();
  });

  const auth = (r: request.Test) =>
    r.set('Authorization', `Bearer ${token}`);

  it('belgeler: 4 sabit yuva MISSING döner; yükleme IN_REVIEW yapar', async () => {
    const list = await auth(
      request(app.getHttpServer()).get('/api/v1/pros/me/documents'),
    ).expect(200);
    expect((list.body as unknown[]).length).toBe(4);
    expect(
      (list.body as Array<{ title: string; status: string }>).map(
        (d) => d.title,
      ),
    ).toEqual([
      'Kimlik doğrulama',
      'Ustalık belgesi',
      'Doğalgaz yetki belgesi',
      'Adres & vergi bilgisi',
    ]);

    const uploaded = await auth(
      request(app.getHttpServer()).post('/api/v1/pros/me/documents'),
    )
      .send({ docType: 'identity', url: '/uploads/gallery-kimlik.webp' })
      .expect(201);
    expect(uploaded.body.status).toBe('IN_REVIEW');

    // Geçersiz tür ve uploads dışı yol reddedilir.
    await auth(request(app.getHttpServer()).post('/api/v1/pros/me/documents'))
      .send({ docType: 'baska', url: '/uploads/x.webp' })
      .expect(400);
    await auth(request(app.getHttpServer()).post('/api/v1/pros/me/documents'))
      .send({ docType: 'identity', url: 'https://kotu.example/x.png' })
      .expect(400);
  });

  it('hizmet kartları: ekle → toggle → sil (prototip proServices)', async () => {
    const created = await auth(
      request(app.getHttpServer()).post('/api/v1/pros/me/services'),
    )
      .send({
        title: 'Klima montajı',
        mode: 'Yerinde',
        priceType: 'Sabit fiyat',
        priceAmount: 600,
      })
      .expect(201);
    expect(created.body).toMatchObject({
      title: 'Klima montajı',
      mode: 'Yerinde',
      priceType: 'Sabit fiyat',
      priceAmount: 600,
      isActive: true,
    });

    const toggled = await auth(
      request(app.getHttpServer()).put(
        `/api/v1/pros/me/services/${created.body.id}`,
      ),
    )
      .send({ isActive: false })
      .expect(200);
    expect(toggled.body.isActive).toBe(false);

    await auth(
      request(app.getHttpServer()).delete(
        `/api/v1/pros/me/services/${created.body.id}`,
      ),
    ).expect(200);
    const list = await auth(
      request(app.getHttpServer()).get('/api/v1/pros/me/services'),
    ).expect(200);
    expect(list.body).toEqual([]);
  });

  it('bölgeler: ekle (~km) → listede → maks mesafe → sil', async () => {
    const region = await auth(
      request(app.getHttpServer()).post('/api/v1/pros/me/regions'),
    )
      .send({ name: 'Ataşehir', approxKm: 5 })
      .expect(201);
    expect(region.body).toMatchObject({ name: 'Ataşehir', approxKm: 5 });

    await auth(
      request(app.getHttpServer()).put('/api/v1/pros/me/max-distance'),
    )
      .send({ maxDistanceKm: 8 })
      .expect(200)
      .expect(({ body }) => expect(body.maxDistanceKm).toBe(8));

    const list = await auth(
      request(app.getHttpServer()).get('/api/v1/pros/me/regions'),
    ).expect(200);
    expect(list.body.maxDistanceKm).toBe(8);
    expect(list.body.regions).toHaveLength(1);

    await auth(
      request(app.getHttpServer()).delete(
        `/api/v1/pros/me/regions/${region.body.id}`,
      ),
    ).expect(200);
  });

  it('çalışma saatleri toplu güncellenir', async () => {
    const hours = Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i + 1,
      isOpen: i < 5,
      opensAt: '09:00',
      closesAt: '18:00',
    }));
    await auth(
      request(app.getHttpServer()).put('/api/v1/pros/me/working-hours'),
    )
      .send({ hours })
      .expect(200)
      .expect(({ body }) => expect(body.updated).toBe(7));

    const me = await auth(
      request(app.getHttpServer()).get('/api/v1/pros/me'),
    ).expect(200);
    expect(me.body.workingHours).toHaveLength(7);
  });

  it('profil PATCH: bio + fiyat notu + kapak (prototip editProfile)', async () => {
    const res = await auth(
      request(app.getHttpServer()).put('/api/v1/pros/me/profile'),
    )
      .send({
        bio: 'Klima montaj ve bakım.',
        priceNote: 'Keşif ücreti ₺150 · kapsamına göre sohbette netleşir.',
        coverUrl: '/uploads/cover-test.webp',
      })
      .expect(200);
    expect(res.body).toEqual({
      bio: 'Klima montaj ve bakım.',
      priceNote: 'Keşif ücreti ₺150 · kapsamına göre sohbette netleşir.',
      coverUrl: '/uploads/cover-test.webp',
    });
  });
});
