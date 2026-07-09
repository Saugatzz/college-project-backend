// src/packages/package.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CreatePackageDto } from './dto/package.dto';
import { PackagesService } from './package.service';
import { FilterPackageDto } from './dto/filter.pakage.dto';

@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  // Public: active tours with optional filters
  // GET /packages                        → all active tours
  // GET /packages?keyword=everest        → filtered
  // GET /packages?minRating=9&maxPrice=1300
  @Get()
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  findAll(@Query() filters: FilterPackageDto) {
    return this.packagesService.findFiltered(filters);
  }

  // Admin: all tours regardless of isActive
  @Get('admin/all')
  findAllAdmin() {
    return this.packagesService.findAllAdmin();

  }
   @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.packagesService.findBySlug(slug);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.findOne(id);
  }

  // Content-based recommendations ("You Might Also Like"), ranked by
  // cosine similarity over each tour's feature vector.
  // GET /packages/:id/similar            → top 3 similar tours
  // GET /packages/:id/similar?limit=6    → top 6 similar tours
  @Get(':id/similar')
  getSimilar(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 3;
    return this.packagesService.getSimilarTours(
      id,
      Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 3,
    );
  }

  @Post()
  create(@Body() dto: CreatePackageDto) {
    return this.packagesService.create(dto);
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: CreatePackageDto) {
    return this.packagesService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.toggleActive(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packagesService.remove(id);
  }
}