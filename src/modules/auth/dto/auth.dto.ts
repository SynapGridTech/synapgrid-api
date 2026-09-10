import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  Matches,
  IsOptional,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { normalizeEmail } from '../../../common/utils/strings.util';

export class LoginDto {
  @ApiProperty({ example: 'admin@synapgrid.net', format: 'email' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) => normalizeEmail(String(value)))
  email: string;

  @ApiProperty({ example: 'Admin@123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}

export class CreateUserDto {
  @ApiProperty({ example: 'support@synapgrid.net', format: 'email' })
  @IsEmail({}, { message: 'A valid email address is required' })
  @Transform(({ value }) => normalizeEmail(String(value)))
  email: string;

  @ApiProperty({
    example: 'Str0ng!Pass',
    minLength: 8,
    description: 'Min 8 chars, at least one letter and one number',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @Matches(/[A-Za-z]/, { message: 'Password must contain a letter' })
  @Matches(/[0-9]/, { message: 'Password must contain a number' })
  password: string;

  @ApiProperty({ example: 'Ada Support', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({ enum: ['admin', 'support'], required: false })
  @IsOptional()
  @IsIn(['admin', 'support'])
  role?: 'admin' | 'support';
}
