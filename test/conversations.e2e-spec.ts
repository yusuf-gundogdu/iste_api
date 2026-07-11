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

describe('Conversations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let proToken: string;
  let proProfileId: string;
  let conversationId: string;
  const customerPhone = '+905009990004';
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
    await prisma.otpCode.deleteMany({});

    customerToken = await login(customerPhone);

    // Seed'deki doğrulanmış bir usta + o ustanın kullanıcısıyla giriş.
    const pro = await prisma.proProfile.findFirstOrThrow({
      where: { verificationStatus: 'VERIFIED', isPublished: true },
      include: { user: true },
    });
    proProfileId = pro.id;
    proToken = await login(pro.user.phone);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { phone: customerPhone } });
    await app.close();
  });

  it('müşteri sohbet başlatır; ikinci istek aynı sohbeti döner', async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ proProfileId })
      .expect(200);
    conversationId = (first.body as { id: string }).id;

    const second = await request(app.getHttpServer())
      .post('/api/v1/conversations')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ proProfileId })
      .expect(200);
    expect((second.body as { id: string }).id).toBe(conversationId);
  });

  it('metin + konum mesajı gönderilir; boş metin reddedilir', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'TEXT', body: 'Merhaba, çamaşır makinem su akıtıyor.' })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'LOCATION', latitude: 40.99, longitude: 29.03 })
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${customerToken}`)
      .send({ type: 'TEXT', body: '   ' })
      .expect(400);
  });

  it('usta sohbeti listesinde görür ve okunmamış sayısı doğru', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);

    const list = res.body as Array<{ id: string; unreadCount: number }>;
    const conversation = list.find((c) => c.id === conversationId);
    expect(conversation).toBeDefined();
    expect(conversation!.unreadCount).toBe(2);
  });

  it('usta mesajları çekince okundu işaretlenir ve yanıt verir', async () => {
    const messages = await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    expect((messages.body as unknown[]).length).toBe(2);

    await request(app.getHttpServer())
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${proToken}`)
      .send({ type: 'TEXT', body: 'Merhaba, yarın bakabilirim.' })
      .expect(201);

    const list = await request(app.getHttpServer())
      .get('/api/v1/conversations')
      .set('Authorization', `Bearer ${proToken}`)
      .expect(200);
    const conversation = (
      list.body as Array<{ id: string; unreadCount: number }>
    ).find((c) => c.id === conversationId);
    expect(conversation!.unreadCount).toBe(0);
  });

  it('üçüncü kişi sohbete erişemez', async () => {
    const stranger = await login('+905009990005');
    await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${stranger}`)
      .expect(403);
    await prisma.user.deleteMany({ where: { phone: '+905009990005' } });
  });
});
