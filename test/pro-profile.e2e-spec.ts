import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaService } from './../src/prisma/prisma.service';

describe('Public Pro Profile (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('doğrulanmış yayındaki profil tüm vitrin verisiyle döner', async () => {
    const seeded = await prisma.proProfile.findFirstOrThrow({
      where: { verificationStatus: 'VERIFIED', isPublished: true },
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/pros/${seeded.id}`)
      .expect(200);

    const body = res.body as {
      displayName: string;
      mainCategory: { name: string };
      subServices: unknown[];
      workingHours: unknown[];
      regions: unknown[];
      openToday: boolean;
      bio: string;
    };
    expect(body.displayName).toBeTruthy();
    expect(body.mainCategory.name).toBeTruthy();
    expect(body.subServices.length).toBeGreaterThan(0);
    expect(body.workingHours.length).toBe(7);
    expect(typeof body.openToday).toBe('boolean');
  });

  it('doğrulanmamış profil 404 döner', async () => {
    // S4 e2e akışından kalan IN_REVIEW profil olabilir; yoksa uydurma id.
    const unverified = await prisma.proProfile.findFirst({
      where: { verificationStatus: { not: 'VERIFIED' } },
    });
    const id = unverified?.id ?? '00000000-0000-0000-0000-000000000000';

    await request(app.getHttpServer()).get(`/api/v1/pros/${id}`).expect(404);
  });

  it('olmayan id 404 döner', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pros/00000000-0000-0000-0000-000000000001')
      .expect(404);
  });
});
