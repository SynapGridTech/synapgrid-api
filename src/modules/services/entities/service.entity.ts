import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/database/base.entity';

@Entity('services')
@Index(['isPublished', 'displayOrder'])
export class Service extends BaseEntity {
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 160 })
  slug: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  icon: string | null;

  @Column({ type: 'boolean', default: true })
  isPublished: boolean;

  @Column({ type: 'int', default: 0 })
  displayOrder: number;

  @Column({ type: 'simple-json', nullable: true })
  features: string[] | null;
}
