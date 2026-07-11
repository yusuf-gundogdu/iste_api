import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { Request } from 'express';
import type { JwtPayload } from '../auth/auth.service';

/** JWT doğrulaması + isAdmin şartı. */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly jwtGuard: JwtAuthGuard) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.jwtGuard.canActivate(context);
    const request = context
      .switchToHttp()
      .getRequest<Request & { user: JwtPayload }>();
    if (!request.user?.isAdmin) {
      throw new ForbiddenException('Yönetici yetkisi gerekli');
    }
    return true;
  }
}
