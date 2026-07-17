import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('SupportService', () => {
  let service: SupportService;

  const prismaMock = {
    supportTicket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const notificationsMock = {
    notify: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();

    service = moduleRef.get(SupportService);
  });

  it('talep oluşturur (imageUrl null olabilir)', async () => {
    prismaMock.supportTicket.create.mockResolvedValue({ id: 't1' });

    const result = await service.create('u1', {
      subject: 'Ödeme sorunu',
      message: 'Ödemem güvencede görünüyor ama usta ulaşamıyor.',
    });

    expect(result).toEqual({ id: 't1' });
    expect(prismaMock.supportTicket.create).toHaveBeenCalledWith({
      data: {
        userId: 'u1',
        subject: 'Ödeme sorunu',
        message: 'Ödemem güvencede görünüyor ama usta ulaşamıyor.',
        imageUrl: null,
      },
    });
  });

  it('kendi taleplerini yeniden eskiye listeler', async () => {
    prismaMock.supportTicket.findMany.mockResolvedValue([{ id: 't1' }]);

    const result = await service.listMine('u1');

    expect(result).toEqual([{ id: 't1' }]);
    expect(prismaMock.supportTicket.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('RESOLVED statüsüne geçince kullanıcıya bildirim gönderir', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
    });
    prismaMock.supportTicket.update.mockResolvedValue({
      id: 't1',
      status: 'RESOLVED',
    });

    await service.updateStatus('t1', { status: 'RESOLVED', adminNote: 'Halledildi' });

    expect(prismaMock.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 't1' },
        data: expect.objectContaining({
          status: 'RESOLVED',
          adminNote: 'Halledildi',
          resolvedAt: expect.any(Date) as Date,
        }),
      }),
    );
    expect(notificationsMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'u1',
        type: 'SUPPORT_UPDATED',
        data: { ticketId: 't1', status: 'RESOLVED' },
      }),
    );
  });

  it('IN_PROGRESS statüsünde bildirim göndermez, resolvedAt sıfırlanır', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue({
      id: 't1',
      userId: 'u1',
    });
    prismaMock.supportTicket.update.mockResolvedValue({ id: 't1' });

    await service.updateStatus('t1', { status: 'IN_PROGRESS' });

    expect(prismaMock.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'IN_PROGRESS',
          resolvedAt: null,
        }),
      }),
    );
    expect(notificationsMock.notify).not.toHaveBeenCalled();
  });

  it('olmayan talepte NotFoundException fırlatır', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue(null);

    await expect(
      service.updateStatus('x', { status: 'RESOLVED' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
