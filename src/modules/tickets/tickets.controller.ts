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
import {
  buildPaginationResponse,
  parsePagination,
} from '../../common/pagination/pagination';
import { TicketsService } from './tickets.service';
import {
  CreateTicketDto,
  ListTicketsQueryDto,
  ReplyTicketDto,
  StaffReplyDto,
  TicketSortDto,
  TrackTicketDto,
  UpdateTicketDto,
} from './dto/ticket.dto';

@ApiTags('Tickets')
@Controller({ path: 'tickets' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  // ---------- Public ----------

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @ApiOperation({ summary: 'Open a support ticket (public, rate limited)' })
  async create(@Body() dto: CreateTicketDto) {
    const { ticket, trackingToken } = await this.ticketsService.create(dto);
    return {
      ticket: {
        id: ticket.id,
        reference: ticket.reference,
        subject: ticket.subject,
        status: ticket.status,
        createdAt: ticket.createdAt,
      },
      trackingToken,
    };
  }

  @Public()
  @Post('track')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 3_600_000, limit: 20 } })
  @ApiOperation({ summary: 'Track a ticket by reference + email (public)' })
  async track(@Body() dto: TrackTicketDto) {
    return this.ticketsService.track(dto);
  }

  @Public()
  @Get(':token')
  @ApiOperation({ summary: 'Get ticket thread by tracking token (public)' })
  async getByToken(@Param('token') token: string) {
    return this.ticketsService.findByTrackingToken(token);
  }

  @Public()
  @Post(':token/replies')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { ttl: 3_600_000, limit: 20 } })
  @ApiOperation({ summary: 'Reply to a ticket by tracking token (public)' })
  async reply(@Param('token') token: string, @Body() dto: ReplyTicketDto) {
    return this.ticketsService.addRequesterReply(token, dto.body);
  }

  // ---------- Admin ----------

  @Get()
  @Roles(Role.SUPPORT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List and filter tickets (support/admin)' })
  async list(@Query() query: ListTicketsQueryDto & TicketSortDto) {
    const { page, limit } = parsePagination(query.page, query.limit);
    const [items, total] = await this.ticketsService.list(query);
    return buildPaginationResponse(items, total, page, limit, '/api/v1/tickets');
  }

  @Get('stats/summary')
  @Roles(Role.SUPPORT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Ticket counts by status (support/admin)' })
  async stats() {
    return this.ticketsService.getStats();
  }

  @Get('admin/:id')
  @Roles(Role.SUPPORT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a ticket by id (support/admin)' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.ticketsService.getTicket(id);
  }

  @Patch('admin/:id')
  @Roles(Role.SUPPORT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update status/priority/assignment (support/admin)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
  ) {
    return this.ticketsService.update(id, dto);
  }

  @Post('admin/:id/replies')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.SUPPORT, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add an internal staff reply (support/admin)' })
  async staffReply(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { sub: string; email: string },
    @Body() dto: StaffReplyDto,
  ) {
    return this.ticketsService.addStaffReply(id, user.sub, user.email, dto.body);
  }
}
