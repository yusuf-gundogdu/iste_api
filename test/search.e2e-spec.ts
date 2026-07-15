import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

interface SearchResponse {
  relatedServices: Array<{ type: string; name: string; categorySlug: string }>;
  pros: Array<{
    displayName: string;
    categorySlug: string;
    distanceKm: number;
    serviceMode: string | null;
    emergency: string | null;
    verifiedReviewCount: number;
    openNow: boolean;
    openTomorrow: boolean;
    worksWeekend: boolean;
    worksEvening: boolean;
    responseMinutes: number | null;
  }>;
}

describe('Search (e2e)', () => {
  let app: INestApplication<App>;
  const base = '/api/v1/search?lat=40.99&lng=29.03';

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

  it('kategori adıyla arama: ilgili hizmetler + ustalar döner', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&q=elektrik`)
      .expect(200);

    const body = res.body as SearchResponse;
    expect(
      body.relatedServices.some((r) => r.categorySlug === 'elektrik'),
    ).toBe(true);
    expect(body.pros.length).toBeGreaterThanOrEqual(1);
    expect(body.pros.every((p) => p.categorySlug === 'elektrik')).toBe(true);

    // Yerel filtreler (mobil filtre sheet'i) bu alanlara dayanır —
    // arama ucu discover ile aynı zenginlikte dönmeli.
    const pro = body.pros[0];
    expect(typeof pro.openNow).toBe('boolean');
    expect(typeof pro.openTomorrow).toBe('boolean');
    expect(typeof pro.worksWeekend).toBe('boolean');
    expect(typeof pro.worksEvening).toBe('boolean');
    expect(typeof pro.verifiedReviewCount).toBe('number');
    expect(pro).toHaveProperty('serviceMode');
    expect(pro).toHaveProperty('emergency');
    expect(pro).toHaveProperty('responseMinutes');
  });

  it('alt hizmet adıyla arama usta bulur (petek temizliği)', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&q=${encodeURIComponent('petek temizliği')}`)
      .expect(200);

    const body = res.body as SearchResponse;
    expect(body.pros.some((p) => p.categorySlug === 'kombi')).toBe(true);
    expect(body.relatedServices.some((r) => r.type === 'subService')).toBe(
      true,
    );
  });

  it('usta adıyla arama çalışır', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&q=Mehmet`)
      .expect(200);

    const body = res.body as SearchResponse;
    expect(body.pros.some((p) => p.displayName.includes('Mehmet'))).toBe(true);
  });

  it('limit + offset ile sayfalama: sayfalar çakışmaz', async () => {
    // 'kombi' kategorisi seed'de birden çok usta içerir.
    const all = await request(app.getHttpServer())
      .get(`${base}&q=kombi`)
      .expect(200);
    const total = (all.body as SearchResponse).pros.length;
    expect(total).toBeGreaterThanOrEqual(2);

    const page1 = await request(app.getHttpServer())
      .get(`${base}&q=kombi&limit=1&offset=0`)
      .expect(200);
    const page2 = await request(app.getHttpServer())
      .get(`${base}&q=kombi&limit=1&offset=1`)
      .expect(200);

    const pros1 = (page1.body as SearchResponse).pros;
    const pros2 = (page2.body as SearchResponse).pros;
    expect(pros1).toHaveLength(1);
    expect(pros2).toHaveLength(1);
    expect(pros1[0].displayName).not.toEqual(pros2[0].displayName);
  });

  it('offset dizinin ötesinde boş usta listesi döner', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&q=kombi&offset=9999`)
      .expect(200);
    expect((res.body as SearchResponse).pros).toHaveLength(0);
  });

  it('kısa sorgu 400 döner', async () => {
    await request(app.getHttpServer()).get(`${base}&q=a`).expect(400);
  });

  it('eşleşmeyen sorgu boş liste döner', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&q=zzzyoktr`)
      .expect(200);

    const body = res.body as SearchResponse;
    expect(body.pros).toHaveLength(0);
    expect(body.relatedServices).toHaveLength(0);
  });
});
