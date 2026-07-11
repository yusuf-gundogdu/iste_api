import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ProsModule } from './pros/pros.module';
import { ConversationsModule } from './conversations/conversations.module';
import { ServiceRecordsModule } from './service-records/service-records.module';
import { SearchModule } from './search/search.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Kullanıcı görselleri sunucu diskinden servis edilir (S3 yok).
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.UPLOAD_DIR ?? './uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { maxAge: '7d', immutable: true },
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    CategoriesModule,
    ProsModule,
    ConversationsModule,
    ServiceRecordsModule,
    SearchModule,
    UploadsModule,
    UsersModule,
  ],
})
export class AppModule {}
