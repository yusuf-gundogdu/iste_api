import { Module } from '@nestjs/common';
import { ServiceRecordsController } from './service-records.controller';
import { ServiceRecordsService } from './service-records.service';

@Module({
  controllers: [ServiceRecordsController],
  providers: [ServiceRecordsService],
  exports: [ServiceRecordsService],
})
export class ServiceRecordsModule {}
