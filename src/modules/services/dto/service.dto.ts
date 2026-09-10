import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateServiceDto {
  @ApiProperty({ example: 'Software & Digital Product Development' })
  @IsString()
  @Length(2, 255)
  title: string;

  @ApiPropertyOptional({ example: 'software-product-development' })
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be kebab-case',
  })
  @Length(2, 160)
  slug?: string;

  @ApiProperty({ example: 'Robust, scalable web, mobile and cloud products from concept to deployment.' })
  @IsString()
  @Length(10, 2000)
  summary: string;

  @ApiPropertyOptional({ example: 'Long-form description of the offering…' })
  @IsOptional()
  @IsString()
  @Length(0, 10_000)
  description?: string;

  @ApiPropertyOptional({ example: 'code' })
  @IsOptional()
  @IsString()
  @Length(0, 100)
  icon?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10_000)
  displayOrder?: number;

  @ApiPropertyOptional({ example: ['Web apps', 'Mobile apps'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[];
}

export class UpdateServiceDto extends PartialType(CreateServiceDto) {}

export class ListServicesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isPublished?: boolean;
}
