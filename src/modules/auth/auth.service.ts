import {
  Injectable,
  UnauthorizedException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto, CreateUserDto } from './dto/auth.dto';
import { generateSecureToken, sha256Hex } from '../../common/utils/strings.util';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokensRepository: Repository<RefreshToken>,
  ) {}

  async login(dto: LoginDto): Promise<AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email);
    // Constant-ish time: even if user is missing, run a hash comparison to
    // reduce username enumeration timing signals.
    const passwordOk = user
      ? await this.usersService.verifyPassword(user, dto.password)
      : await argon2.verify(REFRESH_FALLBACK_HASH, dto.password).catch(() => false);

    if (!user || !passwordOk) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    return this.issueTokenPair(user);
  }

  /**
   * Rotating refresh: consumes the presented refresh token, revokes it,
   * and issues a fresh pair. Reuse of a revoked token revokes the whole family
   * (theft detection).
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const tokenHash = sha256Hex(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({
      where: { tokenHash },
      relations: ['user'],
    });

    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (stored.revoked) {
      // Token reuse → assume theft; revoke every token in the family.
      await this.refreshTokensRepository.update(
        { userId: stored.userId },
        { revoked: true, revokedAt: new Date() },
      );
      this.logger.warn(`Refresh token reuse detected for user ${stored.userId}; family revoked`);
      throw new UnauthorizedException('Refresh token reuse detected; please log in again');
    }

    if (stored.expiresAt && stored.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account is disabled');
    }

    const newTokens = await this.issueTokenPair(stored.user);

    stored.revoked = true;
    stored.revokedAt = new Date();
    await this.refreshTokensRepository.save(stored);

    return newTokens;
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenHash = sha256Hex(refreshToken);
    const stored = await this.refreshTokensRepository.findOne({ where: { tokenHash } });
    if (stored && !stored.revoked) {
      stored.revoked = true;
      stored.revokedAt = new Date();
      await this.refreshTokensRepository.save(stored);
    }
  }

  async revokeAllForUser(userId: string): Promise<void> {
    await this.refreshTokensRepository.update(
      { userId, revoked: false },
      { revoked: true, revokedAt: new Date() },
    );
  }

  private async issueTokenPair(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email, role: user.role, type: 'access' as const };

    const accessToken = await this.jwtService.signAsync(payload);

    const refreshToken = generateSecureToken(48);
    const expiresAt = new Date(
      Date.now() + this.parseExpiryMs(this.configService.get('JWT_REFRESH_EXPIRES') ?? '7d'),
    );

    this.refreshTokensRepository
      .save(
        this.refreshTokensRepository.create({
          tokenHash: sha256Hex(refreshToken),
          user,
          userId: user.id,
          expiresAt,
        }),
      )
      .catch((err) => this.logger.error(`Failed to persist refresh token: ${err.message}`));

    return { accessToken, refreshToken };
  }

  private parseExpiryMs(value: string): number {
    const match = /^(\d+)([smhd])$/.exec(value);
    if (!match) return 7 * MS_PER_DAY;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's':
        return num * 1000;
      case 'm':
        return num * 60 * 1000;
      case 'h':
        return num * 60 * 60 * 1000;
      case 'd':
      default:
        return num * MS_PER_DAY;
    }
  }

  // ---------- Admin user management ----------

  async listUsers(page: number, limit: number): Promise<[User[], number]> {
    return this.usersService.listUsers({ page, limit });
  }

  async getUser(id: string): Promise<User> {
    const user = await this.usersService.findAnyById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(dto: CreateUserDto): Promise<User> {
    return this.usersService.create(dto);
  }

  async setUserActive(id: string, isActive: boolean): Promise<User> {
    const user = await this.usersService.findAnyById(id);
    if (!user) throw new NotFoundException('User not found');
    user.isActive = isActive;
    const saved = await this.usersService.save(user);
    if (!isActive) await this.revokeAllForUser(id);
    return saved;
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.refreshTokensRepository.delete({ expiresAt: LessThan(new Date()) });
  }
}

const REFRESH_FALLBACK_HASH =
  '$argon2id$v=19$m=65536,t=3,p=1$c29tZXNhbHRzb21lc2FsdA$MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDA';
