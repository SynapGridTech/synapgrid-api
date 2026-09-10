import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { Role } from '../../common/guards/roles.enum';
import { buildPaginationResponse, parsePagination } from '../../common/pagination/pagination';
import { AuthService } from './auth.service';
import { CreateUserDto, LoginDto } from './dto/auth.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Auth')
@Controller({ path: 'auth' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Log in and receive access + refresh tokens' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60_000, limit: 20 } })
  @ApiOperation({ summary: 'Rotate refresh token and get a new access token' })
  async refresh(@Body() body: { refreshToken: string }) {
    return this.authService.refresh(body.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke a refresh token' })
  async logout(@Body() body: { refreshToken: string }) {
    await this.authService.logout(body.refreshToken);
    return { success: true };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the currently authenticated user' })
  async me(@CurrentUser() user: { sub: string; email: string; role: Role }) {
    return this.authService.getUser(user.sub);
  }

  // ---------- Admin: user management ----------

  @Get('users')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List users (admin only)' })
  async listUsers(@Query('page') page?: string, @Query('limit') limit?: string) {
    const { page: p, limit: l } = parsePagination(
      page ? Number(page) : undefined,
      limit ? Number(limit) : undefined,
    );
    const [items, total] = await this.authService.listUsers(p, l);
    return buildPaginationResponse(items, total, p, l, '/api/v1/auth/users');
  }

  @Post('users')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an admin or support user (admin only)' })
  async createUser(@Body() dto: CreateUserDto): Promise<User> {
    return this.authService.createUser(dto);
  }

  @Patch('users/:id/status')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable or disable a user; disabling revokes their sessions' })
  async setUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: UpdateUserStatusDto,
  ): Promise<User> {
    return this.authService.setUserActive(id, body.isActive);
  }
}
