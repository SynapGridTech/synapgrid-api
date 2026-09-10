import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from './entities/service.entity';
import { CreateServiceDto, ListServicesQueryDto, UpdateServiceDto } from './dto/service.dto';
import {
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from '../../common/pagination/pagination';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

@Injectable()
export class ServicesService {
  constructor(
    @InjectRepository(Service)
    private readonly servicesRepository: Repository<Service>,
  ) {}

  async create(dto: CreateServiceDto): Promise<Service> {
    const slug = dto.slug ?? slugify(dto.title);
    const existing = await this.servicesRepository.findOne({ where: { slug } });
    if (existing) {
      throw new ConflictException(`A service with slug "${slug}" already exists`);
    }
    return this.servicesRepository.save(
      this.servicesRepository.create({
        ...dto,
        slug,
        features: dto.features ?? null,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
      }),
    );
  }

  async listPublic(): Promise<Service[]> {
    return this.servicesRepository.find({
      where: { isPublished: true },
      order: { displayOrder: 'ASC', createdAt: 'ASC' },
    });
  }

  async list(query: ListServicesQueryDto): Promise<{ items: Service[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const limit = Math.min(
      PAGINATION_MAX_LIMIT,
      Math.max(1, Math.floor(query.limit ?? PAGINATION_DEFAULT_LIMIT)),
    );
    const qb = this.servicesRepository.createQueryBuilder('service');
    if (query.isPublished !== undefined) {
      qb.andWhere('service.isPublished = :isPublished', { isPublished: query.isPublished });
    }
    qb.orderBy('service.displayOrder', 'ASC')
      .addOrderBy('service.createdAt', 'ASC')
      .take(limit)
      .skip((page - 1) * limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getBySlug(slug: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { slug, isPublished: true } });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async getById(id: string): Promise<Service> {
    const service = await this.servicesRepository.findOne({ where: { id } });
    if (!service) throw new NotFoundException('Service not found');
    return service;
  }

  async update(id: string, dto: UpdateServiceDto): Promise<Service> {
    const service = await this.getById(id);
    if (dto.slug && dto.slug !== service.slug) {
      const conflict = await this.servicesRepository.findOne({ where: { slug: dto.slug } });
      if (conflict) {
        throw new ConflictException(`A service with slug "${dto.slug}" already exists`);
      }
    }
    Object.assign(service, dto);
    return this.servicesRepository.save(service);
  }

  async remove(id: string): Promise<void> {
    const service = await this.getById(id);
    await this.servicesRepository.remove(service);
  }
}
