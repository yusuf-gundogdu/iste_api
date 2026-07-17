import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

/** Kullanıcıya bildirim gönderilen kapanış statüleri. */
const CLOSING_STATUSES = ['RESOLVED', 'UNRESOLVED', 'CLOSED'] as const;
type ClosingStatus = (typeof CLOSING_STATUSES)[number];

type SupportStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'RESOLVED'
  | 'UNRESOLVED'
  | 'CLOSED';

/** Bildirim metinleri — statüye göre. */
const STATUS_NOTIFICATION: Record<
  ClosingStatus,
  { title: string; body: string }
> = {
  RESOLVED: {
    title: 'Talebin çözüldü',
    body: 'Yardım talebin çözüme kavuştu. Detayları görüntüleyebilirsin.',
  },
  UNRESOLVED: {
    title: 'Talebin sonuçlandı',
    body: 'Yardım talebin çözülemedi. Detayları görüntüleyebilirsin.',
  },
  CLOSED: {
    title: 'Talebin kapatıldı',
    body: 'Yardım talebin kapatıldı. Detayları görüntüleyebilirsin.',
  },
};

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Müşteri yeni destek talebi açar. */
  create(
    userId: string,
    input: { subject: string; message: string; imageUrl?: string },
  ) {
    return this.prisma.supportTicket.create({
      data: {
        userId,
        subject: input.subject,
        message: input.message,
        imageUrl: input.imageUrl ?? null,
      },
    });
  }

  /** Kullanıcının kendi talepleri (yeniden eskiye). */
  listMine(userId: string) {
    return this.prisma.supportTicket.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Admin: tüm talepler, opsiyonel statü filtresi. */
  listAll(status?: SupportStatus) {
    return this.prisma.supportTicket.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  /**
   * Admin: statü + not günceller. Kapanış statülerine (RESOLVED/UNRESOLVED/
   * CLOSED) geçince talebi açan kullanıcıya bildirim gönderir.
   */
  async updateStatus(
    ticketId: string,
    input: { status: SupportStatus; adminNote?: string },
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, userId: true },
    });
    if (!ticket) throw new NotFoundException('Talep bulunamadı');

    const isClosing = (CLOSING_STATUSES as readonly string[]).includes(
      input.status,
    );

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: input.status,
        adminNote: input.adminNote ?? undefined,
        resolvedAt: isClosing ? new Date() : null,
      },
    });

    if (isClosing) {
      const copy = STATUS_NOTIFICATION[input.status as ClosingStatus];
      await this.notifications.notify({
        userId: ticket.userId,
        type: 'SUPPORT_UPDATED',
        title: copy.title,
        body: copy.body,
        data: { ticketId: ticket.id, status: input.status },
      });
    }

    return updated;
  }
}
