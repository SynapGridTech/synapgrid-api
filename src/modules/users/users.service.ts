import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from './entities/user.entity';
import { CreateUserDto } from '../auth/dto/auth.dto';
import { Role } from '../../common/guards/roles.enum';
import { parsePagination } from '../../common/pagination/pagination';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async findActiveById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id, isActive: true } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const email = dto.email;
    const existing = await this.findByEmail(email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }
    const user = this.usersRepository.create({
      email,
      passwordHash: await argon2.hash(dto.password),
      name: dto.name ?? null,
      role: (dto.role ?? Role.SUPPORT) as Role,
    });
    return this.usersRepository.save(user);
  }

  async verifyPassword(user: User, password: string): Promise<boolean> {
    try {
      return await argon2.verify(user.passwordHash, password);
    } catch {
      return false;
    }
  }

  async findAnyById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }

  async listUsers(options: { page: number; limit: number }): Promise<[User[], number]> {
    const { limit, skip } = parsePagination(options.page, options.limit);
    return this.usersRepository.findAndCount({
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });
  }

  async save(user: User): Promise<User> {
    return this.usersRepository.save(user);
  }

  async count(): Promise<number> {
    return this.usersRepository.count();
  }
}
