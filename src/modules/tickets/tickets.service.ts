import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketPriority, TicketStatus } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import {
  CreateTicketDto,
  ListTicketsQueryDto,
  TicketSortDto,
  TrackTicketDto,
  UpdateTicketDto,
} from './dto/ticket.dto';
import { generateSecureToken, sha256Hex } from '../../common/utils/strings.util';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket)
    private readonly ticketsRepository: Repository<Ticket>,
    @InjectRepository(TicketMessage)
    private readonly ticketMessagesRepository: Repository<TicketMessage>,
  ) {}

  /** Public: creates a ticket and returns the one-time-visible tracking token. */
  async create(dto: CreateTicketDto): Promise<{ ticket: Ticket; trackingToken: string }> {
    const trackingToken = generateSecureToken(24);
    const reference = await this.generateUniqueReference();

    const ticket = await this.ticketsRepository.save(
      this.ticketsRepository.create({
        ...dto,
        trackingTokenHash: sha256Hex(trackingToken),
        reference,
        status: TicketStatus.OPEN,
        priority: TicketPriority.NORMAL,
      }),
    );

    await this.ticketMessagesRepository.save(
      this.ticketMessagesRepository.create({
        ticketId: ticket.id,
        body: dto.body,
        isStaffReply: false,
        authorName: dto.requesterName,
      }),
    );

    return { ticket, trackingToken };
  }

  /** Public: track a ticket by reference + email (magic combination). */
  async track(dto: TrackTicketDto): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { reference: dto.reference.toUpperCase().trim() },
      relations: ['messages'],
    });
    if (!ticket || ticket.requesterEmail !== dto.requesterEmail) {
      throw new NotFoundException('No matching ticket found');
    }
    return ticket;
  }

  /** Public: access ticket thread by opaque tracking token (bearer-style). */
  async findByTrackingToken(trackingToken: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { trackingTokenHash: sha256Hex(trackingToken) },
      relations: ['messages'],
    });
    if (!ticket) throw new UnauthorizedException('Invalid tracking token');
    return ticket;
  }

  /** Public: requester adds a reply by tracking token. */
  async addRequesterReply(trackingToken: string, body: string): Promise<TicketMessage> {
    const ticket = await this.findByTrackingToken(trackingToken);
    const message = await this.ticketMessagesRepository.save(
      this.ticketMessagesRepository.create({
        ticketId: ticket.id,
        body,
        isStaffReply: false,
        authorName: ticket.requesterName,
      }),
    );
    // A requester reply re-opens a resolved/closed ticket automatically.
    if (ticket.status === TicketStatus.RESOLVED || ticket.status === TicketStatus.CLOSED) {
      ticket.status = TicketStatus.OPEN;
      await this.ticketsRepository.save(ticket);
    }
    return message;
  }

  // ---------- Admin ----------

  async list(
    query: ListTicketsQueryDto & TicketSortDto,
  ): Promise<[Ticket[], number]> {
    const { page = 1, limit = 20, status, priority, requesterEmail, sortBy = 'createdAt', sortOrder = 'DESC' } = query;
    const skip = (page - 1) * limit;

    const qb = this.ticketsRepository.createQueryBuilder('ticket');

    if (status) qb.andWhere('ticket.status = :status', { status });
    if (priority) qb.andWhere('ticket.priority = :priority', { priority });
    if (requesterEmail)
      qb.andWhere('ticket.requesterEmail = :requesterEmail', { requesterEmail });

    if (sortBy === 'priority') {
      // Map priority to severity order via CASE.
      qb.addSelect(
        `CASE ticket.priority
           WHEN '${TicketPriority.URGENT}' THEN 0
           WHEN '${TicketPriority.HIGH}' THEN 1
           WHEN '${TicketPriority.NORMAL}' THEN 2
           ELSE 3 END`,
        'priority_order',
      );
      qb.orderBy('priority_order', sortOrder);
    } else {
      qb.orderBy(`ticket.${sortBy === 'createdAt' ? 'created_at' : sortBy}`, sortOrder);
    }

    qb.take(limit).skip(skip);

    return qb.getManyAndCount();
  }

  async getTicket(id: string): Promise<Ticket> {
    const ticket = await this.ticketsRepository.findOne({
      where: { id },
      relations: ['messages'],
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto): Promise<Ticket> {
    const ticket = await this.getTicket(id);
    Object.assign(ticket, dto);
    return this.ticketsRepository.save(ticket);
  }

  async addStaffReply(
    ticketId: string,
    staffUserId: string,
    staffName: string,
    body: string,
  ): Promise<TicketMessage> {
    const ticket = await this.getTicket(ticketId);
    const message = await this.ticketMessagesRepository.save(
      this.ticketMessagesRepository.create({
        ticketId,
        body,
        isStaffReply: true,
        authorName: staffName,
        authorUserId: staffUserId,
      }),
    );
    if (ticket.status === TicketStatus.OPEN) {
      ticket.status = TicketStatus.IN_PROGRESS;
      await this.ticketsRepository.save(ticket);
    }
    return message;
  }

  async getStats(): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    closed: number;
  }> {
    const [open, inProgress, resolved, closed, total] = await Promise.all([
      this.ticketsRepository.count({ where: { status: TicketStatus.OPEN } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.IN_PROGRESS } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.RESOLVED } }),
      this.ticketsRepository.count({ where: { status: TicketStatus.CLOSED } }),
      this.ticketsRepository.count(),
    ]);
    return { total, open, inProgress, resolved, closed };
  }

  private async generateUniqueReference(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = `SG-${generateSecureToken(4).replace(/[^A-Z0-9]/gi, '').slice(0, 6).toUpperCase().padEnd(6, '0')}`;
      const existing = await this.ticketsRepository.findOne({ where: { reference } });
      if (!existing) return reference;
    }
    throw new Error('Could not generate a unique ticket reference');
  }
}
