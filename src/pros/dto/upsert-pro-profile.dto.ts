import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkingHourDto {
  @IsInt()
  @Min(1)
  @Max(7)
  dayOfWeek: number;

  @IsBoolean()
  isOpen: boolean;

  @Matches(/^\d{2}:\d{2}$/)
  opensAt: string;

  @Matches(/^\d{2}:\d{2}$/)
  closesAt: string;
}

export class UpsertProProfileDto {
  @IsUUID()
  mainCategoryId: string;

  @IsString()
  @MaxLength(600)
  bio: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  yearsExperience?: number;

  @IsIn(['ON_SITE', 'WORKSHOP', 'BOTH'])
  serviceMode: 'ON_SITE' | 'WORKSHOP' | 'BOTH';

  @IsIn(['NEGOTIABLE', 'STARTING', 'FIXED'])
  priceApproach: 'NEGOTIABLE' | 'STARTING' | 'FIXED';

  @IsOptional()
  @IsNumber()
  @Min(0)
  priceAmount?: number;

  @IsString()
  @Length(2, 60)
  city: string;

  @IsString()
  @MaxLength(60)
  district: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(30)
  subServiceIds: string[];

  @IsArray()
  @IsUUID(undefined, { each: true })
  @ArrayMaxSize(30)
  brandIds: string[];

  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(20)
  regions: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  @ArrayMaxSize(7)
  workingHours: WorkingHourDto[];
}
