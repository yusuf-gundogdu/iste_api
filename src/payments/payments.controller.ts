import {
  All,
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { PaymentsService } from './payments.service';

class CreatePaymentRequestDto {
  @IsUUID()
  conversationId: string;

  @IsNumber()
  @Min(1)
  @Max(1_000_000)
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}

class RefundRequestDto {
  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('request')
  createRequest(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreatePaymentRequestDto,
  ) {
    return this.payments.createRequest(user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('mine')
  listMine(@CurrentUser() user: JwtPayload) {
    return this.payments.listMine(user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  detail(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.payments.detail(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/checkout')
  @HttpCode(HttpStatus.OK)
  checkout(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    // Host header'a güvenilmez (header injection) — sabit config kullanılır.
    const apiBaseUrl =
      process.env.PUBLIC_API_URL ??
      `http://localhost:${process.env.PORT ?? 3000}/api/v1`;
    return this.payments.checkout(user.sub, id, apiBaseUrl);
  }

  /**
   * Sağlayıcı callback'i — auth yok (3DS yönlendirmesi) ama providerRef
   * doğrulanır: ref bilinmeden ödeme durumu değiştirilemez.
   */
  @All(':id/callback')
  @HttpCode(HttpStatus.OK)
  async callback(
    @Param('id') id: string,
    @Query() query: Record<string, unknown>,
    @Body() body: Record<string, unknown>,
  ) {
    const result = await this.payments.handleCallback(id, {
      ...query,
      ...body,
    });
    // Mobil WebView bu sayfadaki durumu yakalar (iste-payment-result).
    return {
      status: result.success ? 'success' : 'failed',
      redirect: `iste-payment-result://${result.success ? 'success' : 'failed'}?paymentId=${id}`,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  release(@CurrentUser() user: JwtPayload, @Param('id') id: string) {
    return this.payments.release(user.sub, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/refund-request')
  @HttpCode(HttpStatus.OK)
  requestRefund(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: RefundRequestDto,
  ) {
    return this.payments.requestRefund(user.sub, id, dto.note);
  }

  /**
   * Sahte 3DS sayfası (yalnız FakePaymentProvider akışı) — WebView'de
   * banka doğrulama ekranını simüle eder. Callback parametresi dış URL
   * kabul etmez (XSS/open-redirect koruması); form action'ı sunucuda
   * sabit kalıptan üretilir.
   */
  @Get(':id/fake-3ds')
  @Header('Content-Type', 'text/html; charset=utf-8')
  fake3ds(@Param('id') id: string, @Query('ref') ref = ''): string {
    const safeId = encodeURIComponent(id);
    const safeRef = encodeURIComponent(ref);
    const action = `/api/v1/payments/${safeId}/callback`;
    return `<!doctype html><html lang="tr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>3D Secure Doğrulama</title>
<style>body{font-family:sans-serif;background:#f4f4f5;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#fff;border-radius:12px;padding:32px;max-width:340px;text-align:center;box-shadow:0 4px 16px rgba(0,0,0,.08)}
button{width:100%;padding:14px;border:none;border-radius:8px;font-size:16px;margin-top:10px;cursor:pointer}
.ok{background:#15A88F;color:#fff}.no{background:#eee}</style></head><body>
<div class="card"><h3>3D Secure Doğrulama</h3>
<p>Bu bir test ödeme sayfasıdır — gerçek para çekilmez.</p>
<form method="get" action="${action}">
<input type="hidden" name="ref" value="${safeRef}">
<input type="hidden" name="success" value="1">
<button class="ok" type="submit">Ödemeyi Onayla</button></form>
<form method="get" action="${action}">
<input type="hidden" name="ref" value="${safeRef}">
<input type="hidden" name="success" value="0">
<button class="no" type="submit">Reddet</button></form>
</div></body></html>`;
  }
}
