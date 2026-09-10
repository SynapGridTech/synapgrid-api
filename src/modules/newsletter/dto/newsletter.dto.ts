import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { normalizeEmail } from '../../../common/utils/strings.util';

export class SubscribeDto {
  @ApiProperty({ example: 'reader@example.com', format: 'email' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) => normalizeEmail(String(value)))
  email: string;

  @ApiPropertyOptional({ example: 'Ada Reader' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  name?: string;
}

export class ConfirmSubscriptionDto {
  @ApiProperty({ example: 'aGVsbG8gd29ybGQ' })
  @IsString()
  @Length(16, 256)
  token: string;
}

export class ListSubscribersQueryDto {
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
  isConfirmed?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateSubscriberDto {
  @ApiPropertyOptional({ example: 'Ada Reader' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  name?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
