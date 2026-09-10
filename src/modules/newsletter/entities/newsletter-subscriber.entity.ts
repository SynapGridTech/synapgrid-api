import { Column, Entity, Index } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/database/base.entity';

@Entity('newsletter_subscribers')
export class NewsletterSubscriber extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 255 })
  email: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string | null;

  @Index()
  @Column({ type: 'boolean', default: false })
  isConfirmed: boolean;

  @Index()
  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Exclude()
  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  confirmationTokenHash: string | null;

  @Exclude()
  @Index()
  @Column({ type: 'varchar', length: 128, nullable: true })
  unsubscribedTokenHash: string | null;

  @Column({ type: 'datetime', nullable: true })
  confirmedAt: Date | null;

  @Column({ type: 'datetime', nullable: true })
  unsubscribedAt: Date | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  sourceIp: string | null;
}
