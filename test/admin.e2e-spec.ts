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

describe('Admin (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let adminToken: string;
  let userToken: string;
  let pendingProId: string;
  let pendingUserId: string;
  const adminPhone = '+905550009999';
  const applicantPhone = '+905009990012';
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

    await prisma.user.deleteMany({ where: { phone: applicantPhone } });
    adminToken = await login(adminPhone);
    userToken = await login(applicantPhone);

    // Başvuran kullanıcı vitrin kurup doğrulamaya gönderir.
    const category = await prisma.category.findUniqueOrThrow({
      where: { slug: 'boyaci' },
      include: { subServices: true },
    });
    await request(app.getHttpServer())
      .put('/api/v1/pros/me')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        mainCategoryId: category.id,
        bio: 'Boya badana işleri',
        serviceMode: 'ON_SITE',
        priceApproach: 'NEGOTIABLE',
        city: 'İstanbul',
        district: 'Kadıköy',
        subServiceIds: [category.subServices[0].id],
        brandIds: [],
        regions: ['Moda'],
        workingHours: [
          { dayOfWeek: 1, isOpen: true, opensAt: '09:00', closesAt: '18:00' },
        ],
      })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/pros/me/submit')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);

    const profile = await prisma.proProfile.findFirstOrThrow({
      where: { user: { phone: applicantPhone } },
    });
    pendingProId = profile.id;
    pendingUserId = profile.userId;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: applicantPhone } });
    await app.close();
  });

  it('admin olmayan kullanıcı admin uçlarına giremez', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(403);
  });

  it('istatistikler döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const body = res.body as { users: number; pendingVerification: number };
    expect(body.users).toBeGreaterThan(0);
    expect(body.pendingVerification).toBeGreaterThanOrEqual(1);
  });

  it('doğrulama kuyruğu → onay → yayında + kullanıcıya bildirim', async () => {
    const queue = await request(app.getHttpServer())
      .get('/api/v1/admin/verifications')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(
      (queue.body as Array<{ id: string }>).some((p) => p.id === pendingProId),
    ).toBe(true);

    const resolved = await request(app.getHttpServer())
      .post(`/api/v1/admin/verifications/${pendingProId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ approve: true })
      .expect(200);
    const body = resolved.body as {
      verificationStatus: string;
      isPublished: boolean;
    };
    expect(body.verificationStatus).toBe('VERIFIED');
    expect(body.isPublished).toBe(true);

    const notification = await prisma.notification.findFirst({
      where: { userId: pendingUserId, type: 'VERIFICATION_RESULT' },
    });
    expect(notification?.title).toContain('yayında');
  });

  it('yorum moderasyon listesi erişilebilir', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/admin/reviews')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });
});
