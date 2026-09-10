import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { normalizeEmail } from '../../../common/utils/strings.util';
import { TicketPriority, TicketStatus } from '../entities/ticket.entity';

export class CreateTicketDto {
  @ApiProperty({ example: 'Jane Customer', maxLength: 255 })
  @IsString()
  @Length(2, 255)
  requesterName: string;

  @ApiProperty({ example: 'jane@example.com', format: 'email' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) => normalizeEmail(String(value)))
  requesterEmail: string;

  @ApiProperty({ example: 'Payment gateway integration failing', maxLength: 255 })
  @IsString()
  @Length(5, 255)
  subject: string;

  @ApiProperty({
    example: 'We integrated your SDK but keep getting 502s from the webhook endpoint.',
    minLength: 10,
  })
  @IsString()
  @Length(10, 10_000)
  body: string;

  @ApiPropertyOptional({ example: 'integrations' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class TrackTicketDto {
  @ApiProperty({ example: 'SG-8F3K2Q' })
  @IsString()
  @Length(3, 40)
  reference: string;

  @ApiProperty({ example: 'jane@example.com', format: 'email' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) => normalizeEmail(String(value)))
  requesterEmail: string;
}

export class ReplyTicketDto {
  @ApiProperty({ example: 'Still failing after the fix you suggested.' })
  @IsString()
  @Length(2, 10_000)
  body: string;
}

export class UpdateTicketDto {
  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ example: 'user-uuid', nullable: true })
  @IsOptional()
  @IsUUID()
  assignedToId?: string | null;

  @ApiPropertyOptional({ example: 'integrations' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;
}

export class StaffReplyDto {
  @ApiProperty({ example: 'We identified the issue and deployed a fix.' })
  @IsString()
  @Length(2, 10_000)
  body: string;
}

export class ListTicketsQueryDto {
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

  @ApiPropertyOptional({ enum: TicketStatus })
  @IsOptional()
  @IsEnum(TicketStatus)
  status?: TicketStatus;

  @ApiPropertyOptional({ enum: TicketPriority })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ example: 'jane@example.com' })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }) => normalizeEmail(String(value)))
  requesterEmail?: string;
}

export const TICKET_SORT_FIELDS = ['createdAt', 'updatedAt', 'priority', 'status'] as const;
export type TicketSortField = (typeof TICKET_SORT_FIELDS)[number];

export class TicketSortDto {
  @ApiPropertyOptional({ enum: TICKET_SORT_FIELDS, default: 'createdAt' })
  @IsOptional()
  @IsIn(TICKET_SORT_FIELDS as unknown as string[])
  sortBy?: TicketSortField;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'], default: 'DESC' })
  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  sortOrder?: 'ASC' | 'DESC';
}
