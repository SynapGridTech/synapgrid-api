import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { Ticket } from './entities/ticket.entity';
import { TicketMessage } from './entities/ticket-message.entity';
import { CreateTicketDto } from './dto/ticket.dto';

describe('TicketsService', () => {
  let service: TicketsService;
  let ticketsRepo: Record<string, jest.Mock>;
  let messagesRepo: Record<string, jest.Mock>;

  const dto: CreateTicketDto = {
    requesterName: 'Jane Customer',
    requesterEmail: 'jane@example.com',
    subject: 'Gateway failing',
    body: 'The gateway keeps returning 502 errors.',
  };

  beforeEach(async () => {
    ticketsRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 't-1', reference: 'SG-ABC123', ...x })),
      findOne: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    };
    messagesRepo = {
      create: jest.fn((x) => x),
      save: jest.fn(async (x) => ({ id: 'm-1', ...x })),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: getRepositoryToken(Ticket), useValue: ticketsRepo },
        { provide: getRepositoryToken(TicketMessage), useValue: messagesRepo },
      ],
    }).compile();

    service = moduleRef.get(TicketsService);
  });

  describe('create', () => {
    it('creates a ticket with hashed tracking token and initial message', async () => {
      const { ticket, trackingToken } = await service.create(dto);

      expect(ticket.reference).toMatch(/^SG-[A-Z0-9]{6}$/);
      expect(trackingToken).toBeDefined();
      expect(ticket.trackingTokenHash).not.toBe(trackingToken);
      expect(messagesRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ body: dto.body, isStaffReply: false }),
      );
    });
  });

  describe('track', () => {
    it('throws NotFound when no ticket matches', async () => {
      ticketsRepo.findOne.mockResolvedValue(null);
      await expect(
        service.track({ reference: 'SG-XXXXXX', requesterEmail: 'jane@example.com' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when the email does not match the ticket', async () => {
      ticketsRepo.findOne.mockResolvedValue({
        reference: 'SG-ABC123',
        requesterEmail: 'other@example.com',
      });
      await expect(
        service.track({ reference: 'SG-ABC123', requesterEmail: 'jane@example.com' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('returns the ticket on reference+email match', async () => {
      const ticket = { reference: 'SG-ABC123', requesterEmail: 'jane@example.com' };
      ticketsRepo.findOne.mockResolvedValue(ticket);
      await expect(
        service.track({ reference: 'SG-ABC123', requesterEmail: 'jane@example.com' }),
      ).resolves.toBe(ticket);
    });
  });

  describe('findByTrackingToken', () => {
    it('throws Unauthorized for unknown token', async () => {
      ticketsRepo.findOne.mockResolvedValue(null);
      await expect(service.findByTrackingToken('nope')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('getStats', () => {
    it('aggregates counts by status', async () => {
      ticketsRepo.count.mockImplementation(
        ({ where }: { where?: { status?: string } } = {}) => {
          if (!where) return Promise.resolve(10);
          const counts: Record<string, number> = {
            open: 4,
            in_progress: 3,
            resolved: 2,
            closed: 1,
          };
          return Promise.resolve(counts[where.status ?? ''] ?? 0);
        },
      );
      const stats = await service.getStats();
      expect(stats).toEqual({
        total: 10,
        open: 4,
        inProgress: 3,
        resolved: 2,
        closed: 1,
      });
    });
  });
});
