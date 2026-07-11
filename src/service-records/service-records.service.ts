import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

type Status =
  | 'DISCUSSING'
  | 'PAYMENT_PENDING'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

/**
 * Durum makinesi (anayasa RP3). PAYMENT_PENDING'e geçiş yalnız ödeme
 * talebiyle (S12) olur; buradaki manuel geçişler onun dışındakiler.
 */
const MANUAL_TRANSITIONS: Record<Status, Status[]> = {
  DISCUSSING: ['SCHEDULED', 'CANCELLED'],
  PAYMENT_PENDING: ['SCHEDULED', 'CANCELLED'],
  SCHEDULED: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export interface UpdateServiceRecordInput {
  status?: Status;
  title?: string;
  agreedAmount?: number;
  scheduledAt?: string;
  address?: string;
}

@Injectable()
export class ServiceRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sohbetin hizmet kaydını getirir; yoksa (eski sohbet) oluşturur. */
  async byConversation(conversationId: string, userId: string) {
    const conversation = await this.assertParticipant(conversationId, userId);
    const existing = await this.prisma.serviceRecord.findUnique({
      where: { conversationId },
    });
    const record =
      existing ??
      (await this.prisma.serviceRecord.create({
        data: { conversationId },
      }));
    return this.serialize(record, conversation);
  }

  async update(
    conversationId: string,
    userId: string,
    input: UpdateServiceRecordInput,
  ) {
    const conversation = await this.assertParticipant(conversationId, userId);
    const record = await this.prisma.serviceRecord.findUnique({
      where: { conversationId },
    });
    if (!record) throw new NotFoundException('Hizmet kaydı bulunamadı');

    const isPro = conversation.proProfile.userId === userId;

    if (input.status && input.status !== record.status) {
      const allowed = MANUAL_TRANSITIONS[record.status] ?? [];
      if (!allowed.includes(input.status)) {
        throw new BadRequestException('Bu durum geçişi yapılamaz');
      }
      // Müşteri yalnız iptal edebilir; diğer geçişler ustanın işi.
      if (!isPro && input.status !== 'CANCELLED') {
        throw new ForbiddenException('Bu işlemi yalnız usta yapabilir');
      }
    }

    // Başlık/tutar/plan bilgisi ustanındır.
    if (
      !isPro &&
      (input.title !== undefined ||
        input.agreedAmount !== undefined ||
        input.scheduledAt !== undefined ||
        input.address !== undefined)
    ) {
      throw new ForbiddenException('Hizmet detayını yalnız usta düzenler');
    }

    const updated = await this.prisma.serviceRecord.update({
      where: { conversationId },
      data: {
        status: input.status,
        title: input.title,
        agreedAmount: input.agreedAmount,
        scheduledAt: input.scheduledAt
          ? new Date(input.scheduledAt)
          : undefined,
        address: input.address,
      },
    });
    return this.serialize(updated, conversation);
  }

  private async assertParticipant(conversationId: string, userId: string) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      select: {
        id: true,
        customerId: true,
        proProfile: { select: { id: true, userId: true } },
      },
    });
    if (!conversation) throw new NotFoundException('Sohbet bulunamadı');
    if (
      conversation.customerId !== userId &&
      conversation.proProfile.userId !== userId
    ) {
      throw new ForbiddenException('Bu sohbete erişimin yok');
    }
    return conversation;
  }

  private serialize(
    record: {
      id: string;
      conversationId: string;
      status: string;
      title: string | null;
      agreedAmount: unknown;
      scheduledAt: Date | null;
      address: string | null;
    },
    conversation: { proProfile: { userId: string } },
  ) {
    return {
      id: record.id,
      conversationId: record.conversationId,
      status: record.status,
      title: record.title,
      agreedAmount:
        record.agreedAmount == null ? null : Number(record.agreedAmount),
      scheduledAt: record.scheduledAt,
      address: record.address,
      proUserId: conversation.proProfile.userId,
    };
  }
}
