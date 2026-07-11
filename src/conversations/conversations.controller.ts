import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { CurrentUser, JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/auth.service';
import { ConversationsService } from './conversations.service';
import { ChatGateway } from './chat.gateway';

class StartConversationDto {
  @IsUUID()
  proProfileId: string;
}

class SendMessageDto {
  @IsIn(['TEXT', 'IMAGE', 'LOCATION'])
  type: 'TEXT' | 'IMAGE' | 'LOCATION';

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  body?: string;

  @IsOptional()
  @Matches(/^\/uploads\/[\w.-]+$/)
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;
}

@Controller('conversations')
@UseGuards(JwtAuthGuard)
export class ConversationsController {
  constructor(
    private readonly conversations: ConversationsService,
    private readonly gateway: ChatGateway,
  ) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  start(@CurrentUser() user: JwtPayload, @Body() dto: StartConversationDto) {
    return this.conversations.getOrCreate(user.sub, dto.proProfileId);
  }

  @Get()
  list(@CurrentUser() user: JwtPayload) {
    return this.conversations.listMine(user.sub);
  }

  @Get(':id/messages')
  messages(
    @CurrentUser() user: JwtPayload,
    @Param('id') conversationId: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.conversations.messages(conversationId, user.sub, cursor);
  }

  /** REST fallback — socket bağlantısı yokken de mesaj gönderilebilir. */
  @Post(':id/messages')
  async send(
    @CurrentUser() user: JwtPayload,
    @Param('id') conversationId: string,
    @Body() dto: SendMessageDto,
  ) {
    const message = await this.conversations.send({
      conversationId,
      senderId: user.sub,
      type: dto.type,
      body: dto.body,
      imageUrl: dto.imageUrl,
      latitude: dto.latitude,
      longitude: dto.longitude,
    });
    this.gateway.emitToConversation(conversationId, 'message:new', message);
    return message;
  }
}
