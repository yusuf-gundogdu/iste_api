import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface CategoryItem {
  slug: string;
  name: string;
  requiresBrandModel: boolean;
}

describe('Categories (e2e)', () => {
  let app: INestApplication<App>;

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
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /categories seed edilmiş listeyi döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories')
      .expect(200);

    const body = res.body as CategoryItem[];
    expect(body.length).toBeGreaterThanOrEqual(10);
    expect(body.map((c) => c.slug)).toContain('elektrikci');
  });

  it('GET /categories/:slug alt hizmet ve markaları döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories/beyaz-esya-servisi')
      .expect(200);

    const body = res.body as {
      requiresBrandModel: boolean;
      subServices: unknown[];
      brands: unknown[];
    };
    expect(body.requiresBrandModel).toBe(true);
    expect(body.subServices.length).toBeGreaterThanOrEqual(5);
    expect(body.brands.length).toBeGreaterThanOrEqual(5);
  });

  it('GET /categories/yok 404 döner', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/categories/olmayan-kategori')
      .expect(404);
  });
});
