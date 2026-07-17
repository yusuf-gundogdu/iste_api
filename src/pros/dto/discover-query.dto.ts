import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class DiscoverQueryDto {
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
  @Min(0.5)
  @Max(100)
  radiusKm?: number = 15;

  // İl-geneli kapsam: true ise mesafe (radiusKm) yerine kullanıcının merkez
  // konumunun ili baz alınır; o ildeki tüm ustalar döner (additive — verilmezse
  // eski davranış: radiusKm ST_DWithin).
  @IsOptional()
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  provinceWide?: boolean = false;

  @IsOptional()
  @IsString()
  categorySlug?: string;

  @IsOptional()
  @IsString()
  subServiceSlug?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}
