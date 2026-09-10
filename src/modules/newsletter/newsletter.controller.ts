import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
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
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { Role } from '../../common/guards/roles.enum';
import { buildPaginationResponse } from '../../common/pagination/pagination';
import { NewsletterService } from './newsletter.service';
import {
  ConfirmSubscriptionDto,
  ListSubscribersQueryDto,
  SubscribeDto,
  UpdateSubscriberDto,
} from './dto/newsletter.dto';

@ApiTags('Newsletter')
@Controller({ path: 'newsletter' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class NewsletterController {
  constructor(private readonly newsletterService: NewsletterService) {}

  // ---------- Public ----------

  @Public()
  @Post('subscribe')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @ApiOperation({ summary: 'Request a newsletter subscription (double opt-in, rate limited)' })
  async subscribe(@Body() dto: SubscribeDto, @Ip() ip: string) {
    return this.newsletterService.subscribe(dto, ip);
  }

  @Public()
  @Post('confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirm a subscription with the emailed token' })
  async confirm(@Body() dto: ConfirmSubscriptionDto) {
    return this.newsletterService.confirm(dto.token);
  }

  @Public()
  @Post('unsubscribe')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unsubscribe with the token from a sent email' })
  async unsubscribe(@Body() dto: ConfirmSubscriptionDto) {
    return this.newsletterService.unsubscribe(dto.token);
  }

  // ---------- Admin ----------

  @Get('subscribers')
  @Roles(Role.ADMIN, Role.SUPPORT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List subscribers (admin/support)' })
  async listSubscribers(@Query() query: ListSubscribersQueryDto) {
    const { items, total, page, limit } = await this.newsletterService.list(query);
    return buildPaginationResponse(items, total, page, limit, '/api/v1/newsletter/subscribers');
  }

  @Get('stats')
  @Roles(Role.ADMIN, Role.SUPPORT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subscriber counts (admin/support)' })
  async stats() {
    return this.newsletterService.stats();
  }

  @Patch('subscribers/:id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a subscriber (admin only)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriberDto,
  ) {
    return this.newsletterService.update(id, dto);
  }
}
