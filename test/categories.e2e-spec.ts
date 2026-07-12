import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface CategoryItem {
  description: string;
  mode: string;
  subServiceNames: string[];
  proCount: number;
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
    expect(body.map((c) => c.slug)).toContain('elektrik');

    // Kategoriler ekranı kart alanları (prototip cats): açıklama + mod +
    // alt hizmet adları + usta sayısı.
    const elektrik = body.find((c) => c.slug === 'elektrik')!;
    expect(elektrik.description.length).toBeGreaterThan(10);
    expect(['Yerinde', 'Atölye', 'Yerinde + Atölye']).toContain(
      elektrik.mode,
    );
    expect(elektrik.subServiceNames).toContain('Priz / anahtar');
    expect(typeof elektrik.proCount).toBe('number');
  });

  it('GET /categories/:slug alt hizmet ve markaları döner', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/categories/kombi')
      .expect(200);

    const body = res.body as {
      requiresBrandModel: boolean;
      subServices: unknown[];
      brands: unknown[];
    };
    expect(body.requiresBrandModel).toBe(true);
    expect(body.subServices.length).toBeGreaterThanOrEqual(3);
    expect(body.brands.length).toBeGreaterThanOrEqual(3);
  });

  it('GET /categories/yok 404 döner', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/categories/olmayan-kategori')
      .expect(404);
  });
});
