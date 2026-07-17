import { Test } from '@nestjs/testing';
import { ConversationsService } from './conversations.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * NEW_CONVERSATION bildiriminin data'sında usta bağlamının (proName +
 * proProfileId + categoryName + otherName) taşındığını doğrular. Bu alanlar
 * boş gelirse mobil targetRoute başlığı 'Sohbet'e düşer ve usta profil linki
 * gizlenir — regresyon burada yakalanmalı.
 */
describe('ConversationsService (NEW_CONVERSATION bildirimi)', () => {
  let service: ConversationsService;

  const prismaMock = {
    proProfile: {
      findUnique: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const notificationsMock = {
    notify: jest.fn().mockResolvedValue(undefined),
  };

  const conversationWithContext = {
    id: 'conv-1',
    proProfile: {
      id: 'pro-1',
      userId: 'pro-user-1',
      mainCategory: { name: 'Elektrik', slug: 'elektrik' },
      user: {
        id: 'pro-user-1',
        firstName: 'Ayşe',
        lastName: 'Yılmaz',
        avatarUrl: null,
      },
    },
    customer: {
      id: 'cust-1',
      firstName: 'Mehmet',
      lastName: 'Demir',
      avatarUrl: null,
    },
    serviceRecord: { status: 'DISCUSSING', title: null },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ConversationsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();

    service = moduleRef.get(ConversationsService);

    prismaMock.proProfile.findUnique.mockResolvedValue({
      userId: 'pro-user-1',
      isPublished: true,
      verificationStatus: 'VERIFIED',
    });
    prismaMock.conversation.upsert.mockResolvedValue(conversationWithContext);
  });

  it('yeni sohbette notify data usta bağlamını taşır (proName + proProfileId + categoryName + otherName)', async () => {
    // existing yok → NEW_CONVERSATION bildirimi tetiklenir
    prismaMock.conversation.findUnique.mockResolvedValue(null);

    await service.getOrCreate('cust-1', 'pro-1');

    expect(notificationsMock.notify).toHaveBeenCalledTimes(1);
    expect(notificationsMock.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'pro-user-1',
        type: 'NEW_CONVERSATION',
        data: expect.objectContaining({
          conversationId: 'conv-1',
          proName: 'Ayşe Yılmaz',
          proProfileId: 'pro-1',
          categoryName: 'Elektrik',
          otherName: 'Mehmet Demir',
        }) as Record<string, unknown>,
      }),
    );
  });

  it('mevcut sohbette bildirim gönderilmez (mükerrer NEW_CONVERSATION yok)', async () => {
    // existing var → NEW_CONVERSATION tetiklenmez
    prismaMock.conversation.findUnique.mockResolvedValue({ id: 'conv-1' });

    await service.getOrCreate('cust-1', 'pro-1');

    expect(notificationsMock.notify).not.toHaveBeenCalled();
  });

  it('ad/soyad boşsa proName fallback "Usta" olur ama alan yine doldurulur', async () => {
    prismaMock.conversation.findUnique.mockResolvedValue(null);
    prismaMock.conversation.upsert.mockResolvedValue({
      ...conversationWithContext,
      proProfile: {
        ...conversationWithContext.proProfile,
        user: { id: 'pro-user-1', firstName: null, lastName: null, avatarUrl: null },
      },
    });

    await service.getOrCreate('cust-1', 'pro-1');

    const data = (notificationsMock.notify.mock.calls[0][0] as {
      data: Record<string, unknown>;
    }).data;
    expect(data.proName).toBe('Usta');
    expect(data.proProfileId).toBe('pro-1');
    expect(data.categoryName).toBe('Elektrik');
  });
});
