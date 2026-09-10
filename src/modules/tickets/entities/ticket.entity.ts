import { Column, Entity, Index, OneToMany } from 'typeorm';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/database/base.entity';
import { TicketMessage } from './ticket-message.entity';

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
}

export enum TicketPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

@Entity('tickets')
export class Ticket extends BaseEntity {
  @Exclude()
  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64 })
  trackingTokenHash: string;

  @Column({ type: 'varchar', length: 20 })
  reference: string;

  @Column({ type: 'varchar', length: 255 })
  requesterEmail: string;

  @Column({ type: 'varchar', length: 255 })
  requesterName: string;

  @Column({ type: 'varchar', length: 255 })
  subject: string;

  @Column({ type: 'text' })
  body: string;

  @Index()
  @Column({ type: 'varchar', length: 20, default: TicketStatus.OPEN })
  status: TicketStatus;

  @Index()
  @Column({ type: 'varchar', length: 20, default: TicketPriority.NORMAL })
  priority: TicketPriority;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category: string | null;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  assignedToId: string | null;

  @OneToMany(() => TicketMessage, (message) => message.ticket)
  messages: TicketMessage[];
}
