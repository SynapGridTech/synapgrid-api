import {
  Body,
  Controller,
  Delete,
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
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/guards/roles.decorator';
import { Role } from '../../common/guards/roles.enum';
import { buildPaginationResponse } from '../../common/pagination/pagination';
import { ServicesService } from './services.service';
import { CreateServiceDto, ListServicesQueryDto, UpdateServiceDto } from './dto/service.dto';

@ApiTags('Services')
@Controller({ path: 'services' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  // ---------- Public ----------

  @Public()
  @Get()
  @ApiOperation({ summary: 'List published services (public)' })
  async listPublic() {
    const items = await this.servicesService.listPublic();
    return { items, meta: { itemCount: items.length } };
  }

  @Public()
  @Get('slug/:slug')
  @ApiOperation({ summary: 'Get a published service by slug (public)' })
  async getBySlug(@Param('slug') slug: string) {
    return this.servicesService.getBySlug(slug);
  }

  // ---------- Admin ----------

  @Get('admin')
  @Roles(Role.ADMIN, Role.SUPPORT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all services incl. drafts (admin/support)' })
  async list(@Query() query: ListServicesQueryDto) {
    const { items, total, page, limit } = await this.servicesService.list(query);
    return buildPaginationResponse(items, total, page, limit, '/api/v1/services/admin');
  }

  @Get('admin/:id')
  @Roles(Role.ADMIN, Role.SUPPORT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get a service by id (admin/support)' })
  async getById(@Param('id', ParseUUIDPipe) id: string) {
    return this.servicesService.getById(id);
  }

  @Post('admin')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a service (admin only)' })
  async create(@Body() dto: CreateServiceDto) {
    return this.servicesService.create(dto);
  }

  @Patch('admin/:id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a service (admin only)' })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.update(id, dto);
  }

  @Delete('admin/:id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a service (admin only)' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.servicesService.remove(id);
  }
}
