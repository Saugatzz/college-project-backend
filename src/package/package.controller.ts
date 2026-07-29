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
  Req,
  UseGuards,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { CreatePackageDto } from './dto/package.dto';
import { PackagesService } from './package.service';
import { FilterPackageDto } from './dto/filter.pakage.dto';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';

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

  // Personalized "Recommended for you" tours for the account dashboard,
  // built from the logged-in user's own view/booking history. Guests
  // (no/invalid token) still get a sensible response — top-rated active
  // tours — rather than an error, since OptionalJwtAuthGuard never
  // blocks the request. Declared before ':id' so "recommendations" is
  // never parsed as a numeric package id.
  @Get('recommendations/me')
  @UseGuards(OptionalJwtAuthGuard)
  getMyRecommendations(@Req() req: Request, @Query('limit') limit?: string) {
    const user = req.user as any;
    const parsedLimit = limit ? parseInt(limit, 10) : 6;
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : 6;
    return this.packagesService.getRecommendationsForUser(user?.id ?? null, safeLimit);
  }

   @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.packagesService.findBySlug(slug);
  }

  // Distinct tour categories in active use — powers the "what kind of
  // trips are you into?" picker on the signup page. Public: no auth
  // needed to see what categories exist.
  @Get('categories')
  getCategories() {
    return this.packagesService.getDistinctCategories();
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

  // Records that a logged-in user viewed this tour, feeding their
  // personalized recommendations. Silently does nothing for guests
  // (OptionalJwtAuthGuard) — there's no history to attach a view to.
  @Post(':id/interact')
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async trackInteraction(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    if (user) {
      await this.packagesService.trackInteraction(user.id, id, 'view');
    }
    return { ok: true };
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