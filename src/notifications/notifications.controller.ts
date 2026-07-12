import { Controller, Delete, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.notifications.list(user.sub);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser() user: JwtPayload) {
    return { count: await this.notifications.unreadCount(user.sub) };
  }

  /** Prototip 'Temizle': tüm bildirimleri kaldırır. */
  @Delete()
  clearAll(@CurrentUser() user: JwtPayload) {
    return this.notifications.clearAll(user.sub);
  }

  @Post('read-all')
  markAllRead(@CurrentUser() user: JwtPayload) {
    return this.notifications.markAllRead(user.sub);
  }
}
