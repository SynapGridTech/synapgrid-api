import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NewsletterSubscriber } from './entities/newsletter-subscriber.entity';
import { SubscribeDto, UpdateSubscriberDto } from './dto/newsletter.dto';
import { generateSecureToken, sha256Hex } from '../../common/utils/strings.util';
import { MailerService } from '../../infrastructure/mailer/mailer.service';
import { PAGINATION_DEFAULT_LIMIT, PAGINATION_MAX_LIMIT } from '../../common/pagination/pagination';

@Injectable()
export class NewsletterService {
  private readonly logger = new Logger(NewsletterService.name);

  constructor(
    @InjectRepository(NewsletterSubscriber)
    private readonly subscribersRepository: Repository<NewsletterSubscriber>,
    private readonly mailerService: MailerService,
  ) {}

  /**
   * Double opt-in subscribe: creates/refreshes the subscriber and emails a
   * confirmation link. Response never reveals whether the email existed.
   */
  async subscribe(dto: SubscribeDto, sourceIp: string | null): Promise<{ message: string }> {
    const existing = await this.subscribersRepository.findOne({
      where: { email: dto.email },
    });

    const confirmationToken = generateSecureToken(24);

    if (existing) {
      existing.confirmationTokenHash = sha256Hex(confirmationToken);
      existing.unsubscribedAt = null;
      existing.isActive = true;
      if (dto.name) existing.name = dto.name;
      await this.subscribersRepository.save(existing);
    } else {
      await this.subscribersRepository.save(
        this.subscribersRepository.create({
          email: dto.email,
          name: dto.name ?? null,
          confirmationTokenHash: sha256Hex(confirmationToken),
          sourceIp,
        }),
      );
    }

    this.mailerService
      .sendNewsletterConfirmation(dto.email, confirmationToken)
      .catch((err) => this.logger.error(`Failed to send confirmation: ${err.message}`));

    return { message: 'Check your inbox to confirm your subscription.' };
  }

  async confirm(token: string): Promise<{ message: string }> {
    const subscriber = await this.subscribersRepository.findOne({
      where: { confirmationTokenHash: sha256Hex(token) },
    });
    if (!subscriber) {
      throw new NotFoundException('Invalid or expired confirmation token');
    }
    subscriber.isConfirmed = true;
    subscriber.confirmedAt = new Date();
    subscriber.confirmationTokenHash = null;
    await this.subscribersRepository.save(subscriber);
    return { message: 'Subscription confirmed. Welcome aboard!' };
  }

  async unsubscribe(token: string): Promise<{ message: string }> {
    const subscriber = await this.subscribersRepository.findOne({
      where: { confirmationTokenHash: sha256Hex(token) },
    });
    // Also allow unsubscribe via a permanently valid token derived from email.
    if (!subscriber) {
      const byUnsubToken = await this.subscribersRepository.findOne({
        where: { unsubscribedTokenHash: sha256Hex(token) },
      });
      if (!byUnsubToken) {
        throw new NotFoundException('Invalid unsubscribe token');
      }
      await this.deactivate(byUnsubToken);
      return { message: 'You have been unsubscribed.' };
    }
    await this.deactivate(subscriber);
    return { message: 'You have been unsubscribed.' };
  }

  private async deactivate(subscriber: NewsletterSubscriber): Promise<void> {
    subscriber.isActive = false;
    subscriber.unsubscribedAt = new Date();
    subscriber.confirmationTokenHash = null;
    await this.subscribersRepository.save(subscriber);
  }

  // ---------- Admin ----------

  async list(query: { page?: number; limit?: number; isConfirmed?: boolean; isActive?: boolean }) {
    const page = Math.max(1, Math.floor(query.page ?? 1));
    const limit = Math.min(
      PAGINATION_MAX_LIMIT,
      Math.max(1, Math.floor(query.limit ?? PAGINATION_DEFAULT_LIMIT)),
    );
    const qb = this.subscribersRepository.createQueryBuilder('subscriber');
    if (query.isConfirmed !== undefined)
      qb.andWhere('subscriber.isConfirmed = :isConfirmed', { isConfirmed: query.isConfirmed });
    if (query.isActive !== undefined)
      qb.andWhere('subscriber.isActive = :isActive', { isActive: query.isActive });
    qb.orderBy('subscriber.createdAt', 'DESC').take(limit).skip((page - 1) * limit);
    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async stats() {
    const [total, confirmed, active, unsubscribed] = await Promise.all([
      this.subscribersRepository.count(),
      this.subscribersRepository.count({ where: { isConfirmed: true } }),
      this.subscribersRepository.count({ where: { isActive: true } }),
      this.subscribersRepository.count({ where: { isActive: false } }),
    ]);
    return { total, confirmed, active, unsubscribed };
  }

  async update(id: string, dto: UpdateSubscriberDto) {
    const subscriber = await this.subscribersRepository.findOne({ where: { id } });
    if (!subscriber) throw new NotFoundException('Subscriber not found');
    Object.assign(subscriber, dto);
    return this.subscribersRepository.save(subscriber);
  }
}
