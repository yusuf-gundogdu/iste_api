import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import sharp from 'sharp';

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

/** Görsel tipine göre en-boy sınırı. */
const SIZE_BY_KIND: Record<string, { width: number; height: number }> = {
  avatar: { width: 512, height: 512 },
  cover: { width: 1600, height: 900 },
  gallery: { width: 1600, height: 1600 },
  chat: { width: 1280, height: 1280 },
};

@Injectable()
export class UploadsService {
  private readonly dir = process.env.UPLOAD_DIR ?? './uploads';

  /**
   * Görseli sunucu diskine kaydeder (S3 yok — ürün kararı).
   * Her görsel yeniden boyutlandırılıp webp'e çevrilir; EXIF vb. atılır.
   */
  async saveImage(
    file: { buffer: Buffer; mimetype: string; size: number } | undefined,
    kind: string,
  ): Promise<{ url: string }> {
    if (!file) {
      throw new BadRequestException('Dosya gerekli');
    }
    if (!ALLOWED_MIME.has(file.mimetype)) {
      throw new BadRequestException('Yalnızca görsel yükleyebilirsin');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException("Görsel 10MB'den büyük olamaz");
    }
    const size = SIZE_BY_KIND[kind];
    if (!size) {
      throw new BadRequestException('Geçersiz görsel tipi');
    }

    const name = `${kind}-${randomUUID()}.webp`;
    const processed = await sharp(file.buffer)
      .rotate() // EXIF yönünü uygula
      .resize(size.width, size.height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();

    await mkdir(this.dir, { recursive: true });
    await writeFile(join(this.dir, name), processed);

    return { url: `/uploads/${name}` };
  }
}
