import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  const prismaMock = {
    $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
  };

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: PrismaService, useValue: prismaMock }],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('DB erişilebilirken ok döner', async () => {
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(prismaMock.$queryRaw).toHaveBeenCalled();
  });

  it('DB düşükken hata fırlatır', async () => {
    prismaMock.$queryRaw.mockRejectedValueOnce(new Error('down'));

    await expect(controller.check()).rejects.toThrow('down');
  });
});
