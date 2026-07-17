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
  city: string;
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

  it('limit + offset ile sayfalama: ikinci sayfa farklı ustalar döner', async () => {
    const page1 = await request(app.getHttpServer())
      .get(`${base}&limit=3&offset=0`)
      .expect(200);
    const page2 = await request(app.getHttpServer())
      .get(`${base}&limit=3&offset=3`)
      .expect(200);

    const items1 = page1.body as DiscoverItem[];
    const items2 = page2.body as DiscoverItem[];
    expect(items1.length).toBeLessThanOrEqual(3);
    // İki sayfa çakışmaz (mesafe sıralı, disjoint pencereler).
    const names1 = new Set(items1.map((i) => i.displayName));
    expect(items2.every((i) => !names1.has(i.displayName))).toBe(true);

    // Sayfalar birleşince parametresiz (ilk sayfa) sonuçla aynı sırayı verir.
    const all = await request(app.getHttpServer()).get(base).expect(200);
    const allItems = all.body as DiscoverItem[];
    const combined = [...items1, ...items2].map((i) => i.displayName);
    expect(allItems.slice(0, combined.length).map((i) => i.displayName)).toEqual(
      combined,
    );
  });

  it('offset dizinin ötesinde boş liste döner', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&offset=9999`)
      .expect(200);
    expect(res.body as DiscoverItem[]).toHaveLength(0);
  });

  it('geçersiz koordinat 400 döner', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pros/discover?lat=999&lng=29')
      .expect(400);
  });

  // ── 3.8 + 3.10 İl geneli (provinceWide) ──
  it('provinceWide=true il (city) bazlı filtreler — hepsi aynı il', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&provinceWide=true`)
      .expect(200);

    const items = res.body as DiscoverItem[];
    expect(items.length).toBeGreaterThanOrEqual(8);
    // Merkeze en yakın ustanın ili (Atakum → Samsun) baz alınır; hepsi o il.
    const cities = new Set(items.map((i) => i.city));
    expect(cities.size).toBe(1);
    expect([...cities][0]).toBe('Samsun');
  });

  it('3.10 regresyon — provinceWide=true dar yarıçapı YOK SAYAR '
    + '(city bazlı, ST_DWithin değil)', async () => {
    // radiusKm=1 mesafe filtresiyle sadece çok yakınlar döner.
    const narrow = await request(app.getHttpServer())
      .get(`${base}&radiusKm=1`)
      .expect(200);
    // provinceWide açıkken aynı dar yarıçap yok sayılır → il geneli döner.
    const wide = await request(app.getHttpServer())
      .get(`${base}&provinceWide=true&radiusKm=1`)
      .expect(200);

    const narrowItems = narrow.body as DiscoverItem[];
    const wideItems = wide.body as DiscoverItem[];
    expect(wideItems.length).toBeGreaterThan(narrowItems.length);
    expect(wideItems.every((i) => i.city === 'Samsun')).toBe(true);
  });

  it('provinceWide=false (varsayılan) mesafe (ST_DWithin) filtresi geçerli', async () => {
    const res = await request(app.getHttpServer())
      .get(`${base}&radiusKm=2`)
      .expect(200);
    // Eski davranış korunur: yarıçap dışındakiler elenir.
    expect((res.body as DiscoverItem[]).every((i) => i.distanceKm <= 2)).toBe(
      true,
    );
  });
});
