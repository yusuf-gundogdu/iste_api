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

describe('Pros (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let token: string;
  const phone = '+905009990002';
  const sms = new CapturingSmsSender();

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
    await prisma.user.deleteMany({ where: { phone } });
    await prisma.otpCode.deleteMany({ where: { phone } });

    // Gerçek OTP akışıyla oturum aç.
    await request(app.getHttpServer())
      .post('/api/v1/auth/otp/request')
      .send({ phone })
      .expect(200);
    const verify = await request(app.getHttpServer())
      .post('/api/v1/auth/otp/verify')
      .send({ phone, code: sms.lastCode })
      .expect(200);
    token = (verify.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone } });
    await prisma.otpCode.deleteMany({ where: { phone } });
    await app.close();
  });

  const buildDto = async () => {
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: 'beyaz-esya-servisi' },
      include: { subServices: true, brands: true },
    });
    return {
      mainCategoryId: category.id,
      bio: '15 yıldır beyaz eşya tamiri yapıyorum.',
      yearsExperience: 15,
      serviceMode: 'ON_SITE',
      priceApproach: 'STARTING',
      priceAmount: 750,
      city: 'İstanbul',
      district: 'Kadıköy',
      subServiceIds: category.subServices.slice(0, 2).map((s) => s.id),
      brandIds: category.brands.slice(0, 3).map((b) => b.id),
      regions: ['Kadıköy', 'Üsküdar', 'Ataşehir'],
      workingHours: [
        { dayOfWeek: 1, isOpen: true, opensAt: '09:00', closesAt: '18:00' },
        { dayOfWeek: 7, isOpen: false, opensAt: '09:00', closesAt: '18:00' },
      ],
    };
  };

  it('GET /pros/me profil yokken 404', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pros/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('PUT /pros/me taslak oluşturur; tekrar PUT idempotent günceller', async () => {
    const dto = await buildDto();

    const first = await request(app.getHttpServer())
      .put('/api/v1/pros/me')
      .set('Authorization', `Bearer ${token}`)
      .send(dto)
      .expect(200);

    const created = first.body as {
      verificationStatus: string;
      subServices: unknown[];
      brands: unknown[];
      regions: unknown[];
      workingHours: unknown[];
    };
    expect(created.verificationStatus).toBe('MISSING');
    expect(created.subServices).toHaveLength(2);
    expect(created.brands).toHaveLength(3);
    expect(created.regions).toHaveLength(3);
    expect(created.workingHours).toHaveLength(2);

    // Güncelleme: bölgeleri daralt
    const second = await request(app.getHttpServer())
      .put('/api/v1/pros/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...dto, regions: ['Kadıköy'] })
      .expect(200);
    expect((second.body as { regions: unknown[] }).regions).toHaveLength(1);
  });

  it('fiyat tutarı olmadan STARTING reddedilir', async () => {
    const dto = await buildDto();
    await request(app.getHttpServer())
      .put('/api/v1/pros/me')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...dto, priceAmount: undefined })
      .expect(400);
  });

  it('POST /pros/me/submit → IN_REVIEW; ikinci submit reddedilir', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/pros/me/submit')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(
      (res.body as { verificationStatus: string }).verificationStatus,
    ).toBe('IN_REVIEW');

    await request(app.getHttpServer())
      .post('/api/v1/pros/me/submit')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);
  });

  it('token olmadan 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/pros/me').expect(401);
  });
});
