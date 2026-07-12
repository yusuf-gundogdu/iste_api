import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Conversations (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let customerToken: string;
  let proToken: string;
  let proProfileId: string;
  let conversationId: string;
  const customerSub = 'test-kullanici-4';

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

    // Seed'deki doğrulanmış bir usta + o ustanın kullanıcısıyla giriş.
    const pro = await prisma.proProfile.findFirstOrThrow({
      where: { verificationStatus: 'VERIFIED', isPublished: true },
      include: { user: true },
    });
    proProfileId = pro.id;
    proToken = await login(pro.user.providerSub);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { providerSub: customerSub } });
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
    const stranger = await login('test-kullanici-5');
    await request(app.getHttpServer())
      .get(`/api/v1/conversations/${conversationId}/messages`)
      .set('Authorization', `Bearer ${stranger}`)
      .expect(403);
    await prisma.user.deleteMany({
      where: { providerSub: 'test-kullanici-5' },
    });
  });
});
