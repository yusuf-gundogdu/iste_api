import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

/**
 * Usta modu yeni yüzeyleri (prototip pdash / payouts / payoutReq):
 * çevrimiçi toggle · banka hesabı · aktarım talebi · panel alanları.
 */
describe('Pro earnings & panel (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  const sub = 'test-pro-kazanc';

  const login = async (who: string) => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/social')
      .send({
        provider: 'GOOGLE',
        idToken: JSON.stringify({ sub: who, email: `${who}@test.iste` }),
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
    await prisma.user.deleteMany({ where: { providerSub: sub } });
    token = await login(sub);

    // Vitrin kur (panel/kazanç uçları ProProfile ister).
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: 'kombi' },
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
        verificationStatus: 'VERIFIED',
        isPublished: true,
      },
    });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { providerSub: sub } });
    await app.close();
  });

  it('panel prototip alanlarını döner (isim, toggle, metrikler, listeler)', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pros/me/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body).toMatchObject({
      isOnline: true,
      paymentPendingCount: 0,
      newConversations: 0,
      activeJobs: 0,
    });
    expect(typeof res.body.displayName).toBe('string');
    expect(Array.isArray(res.body.todayJobs)).toBe(true);
    expect(Array.isArray(res.body.newChats)).toBe(true);
    // Yorum yokken ortalama puan null olmalı (prototip '—').
    expect(res.body.ratingAvg).toBeNull();
  });

  it('çevrimiçi/çevrimdışı toggle çalışır ve panele yansır', async () => {
    await request(app.getHttpServer())
      .put('/api/v1/pros/me/online')
      .set('Authorization', `Bearer ${token}`)
      .send({ isOnline: false })
      .expect(200)
      .expect(({ body }) => expect(body.isOnline).toBe(false));

    const dash = await request(app.getHttpServer())
      .get('/api/v1/pros/me/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(dash.body.isOnline).toBe(false);

    await request(app.getHttpServer())
      .put('/api/v1/pros/me/online')
      .set('Authorization', `Bearer ${token}`)
      .send({ isOnline: true })
      .expect(200);
  });

  it('kazanç özeti prototip payouts alanlarını döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/pros/me/earnings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.summary).toMatchObject({
      available: 0,
      monthTotal: 0,
      commissionPct: 2,
    });
    expect(res.body.bank).toBeNull();
    expect(res.body.payouts).toEqual([]);
  });

  it('banka hesabı yokken aktarım talebi reddedilir', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pros/me/payouts')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 100 })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toContain('banka hesabı'),
      );
  });

  it('banka hesabı kaydedilir ve IBAN maskeli döner', async () => {
    const res = await request(app.getHttpServer())
      .put('/api/v1/pros/me/bank-account')
      .set('Authorization', `Bearer ${token}`)
      .send({
        bankName: 'Ziraat Bankası',
        iban: 'TR330006100519786457841326',
      })
      .expect(200);

    expect(res.body).toEqual({
      bankName: 'Ziraat Bankası',
      ibanMasked: 'TR•• •••• •••• 1326',
    });

    // Geçersiz IBAN reddedilir.
    await request(app.getHttpServer())
      .put('/api/v1/pros/me/bank-account')
      .set('Authorization', `Bearer ${token}`)
      .send({ bankName: 'X', iban: 'TR123' })
      .expect(400);
  });

  it('ham IBAN hiçbir uçtan sızmaz (earnings + /pros/me maskeli)', async () => {
    const earnings = await request(app.getHttpServer())
      .get('/api/v1/pros/me/earnings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(earnings.body.bank).toEqual({
      bankName: 'Ziraat Bankası',
      ibanMasked: 'TR•• •••• •••• 1326',
    });
    expect(JSON.stringify(earnings.body)).not.toContain(
      'TR330006100519786457841326',
    );

    const mine = await request(app.getHttpServer())
      .get('/api/v1/pros/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(mine.body.iban).toBe('TR•• •••• •••• 1326');
    expect(JSON.stringify(mine.body)).not.toContain(
      'TR330006100519786457841326',
    );
  });

  it('aktarılabilir bakiyeyi aşan talep reddedilir (prototip kuralı)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/pros/me/payouts')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 999999 })
      .expect(400)
      .expect(({ body }) =>
        expect(body.message).toBe('Aktarılabilir kazancını aşamazsın'),
      );
  });

  it('vitrinsiz kullanıcı panel/kazanç uçlarına erişemez', async () => {
    const stranger = await login('test-pro-kazanc-vitrinsiz');
    await request(app.getHttpServer())
      .get('/api/v1/pros/me/dashboard')
      .set('Authorization', `Bearer ${stranger}`)
      .expect(404);
    await request(app.getHttpServer())
      .put('/api/v1/pros/me/online')
      .set('Authorization', `Bearer ${stranger}`)
      .send({ isOnline: false })
      .expect(404);
    await prisma.user.deleteMany({
      where: { providerSub: 'test-pro-kazanc-vitrinsiz' },
    });
  });
});
