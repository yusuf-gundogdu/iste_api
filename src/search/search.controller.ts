import { Controller, Get, Query } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';
import { SearchService } from './search.service';

class SearchQueryDto {
  @IsString()
  @MinLength(2, { message: 'En az 2 karakter yaz' })
  q: string;

  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}

@Controller('search')
export class SearchController {
  constructor(private readonly search: SearchService) {}

  @Get()
  run(@Query() query: SearchQueryDto) {
    return this.search.search(
      query.q,
      query.lat,
      query.lng,
      query.limit,
      query.offset,
    );
  }
}
