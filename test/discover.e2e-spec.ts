import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface DiscoverItem {
  displayName: string;
  categorySlug: string;
  distanceKm: number;
  openToday: boolean;
}

describe('Discover (e2e)', () => {
  let app: INestApplication<App>;
  // Kadıköy merkez — seed'deki demo ustaların çevresi.
  const base = '/api/v1/pros/discover?lat=41.32&lng=36.33';

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

  it('yakındaki doğrulanmış ustaları mesafe sıralı döner (auth gerekmez)', async () => {
    const res = await request(app.getHttpServer()).get(base).expect(200);

    const items = res.body as DiscoverItem[];
    expect(items.length).toBeGreaterThanOrEqual(8);
    // Mesafe artan sırada
    const distances = items.map((i) => i.distanceKm);
    expect([...distances].sort((a, b) => a - b)).toEqual(distances);
    expect(items[0].displayName).toBeTruthy();
  });

  it('kategori filtresi çalışır', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&categorySlug=elektrik`)
      .expect(200);

    const items = res.body as DiscoverItem[];
    expect(items.length).toBeGreaterThanOrEqual(1);
    expect(items.every((i) => i.categorySlug === 'elektrik')).toBe(true);
  });

  it('dar yarıçap uzak ustaları eler', async () => {
    const all = await request(app.getHttpServer()).get(base).expect(200);
    const near = await request(app.getHttpServer())
      .get(`${base}&radiusKm=2`)
      .expect(200);

    expect((near.body as DiscoverItem[]).length).toBeLessThan(
      (all.body as DiscoverItem[]).length,
    );
    expect((near.body as DiscoverItem[]).every((i) => i.distanceKm <= 2)).toBe(
      true,
    );
  });

  it('geçersiz koordinat 400 döner', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pros/discover?lat=999&lng=29')
      .expect(400);
  });
});
