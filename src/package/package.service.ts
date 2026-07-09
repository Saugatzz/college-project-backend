// src/packages/package.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from 'src/entities/package.entity';
import { TourItinerary } from 'src/entities/tour-itinerary.entity';
import { TourHighlight } from 'src/entities/tour-highlight.entity';
import { TourInclusion } from 'src/entities/tour-inclusion.entity';
import { TourAddon } from 'src/entities/tour-addon.entity';
import { TourImage } from 'src/entities/tour-image.entity';
import { CreatePackageDto } from './dto/package.dto';
import { FilterPackageDto } from './dto/filter.pakage.dto';
import { Booking } from 'src/entities/booking.entity';
import { rankSimilarPackages } from './algorithms/recommendation.util';
import { rankByKeyword } from './algorithms/search-ranking.util';

@Injectable()
export class PackagesService {
  private readonly relations = {
    itineraries: true,
    highlights:  true,
    inclusions:  true,
    addons:      true,
    images:      true,
  } as const;

  constructor(
    @InjectRepository(Package)
    private readonly packageRepo: Repository<Package>,
    @InjectRepository(TourItinerary)
    private readonly itineraryRepo: Repository<TourItinerary>,
    @InjectRepository(TourHighlight)
    private readonly highlightRepo: Repository<TourHighlight>,
    @InjectRepository(TourInclusion)
    private readonly inclusionRepo: Repository<TourInclusion>,
    @InjectRepository(TourAddon)
    private readonly addonRepo: Repository<TourAddon>,
    @InjectRepository(TourImage)
    private readonly imageRepo: Repository<TourImage>,
    // add to constructor
@InjectRepository(Booking)
private readonly bookingRepo: Repository<Booking>,
  ) {}

  findAll(): Promise<Package[]> {
    return this.packageRepo.find({
      where: { isActive: true },
      order: { price: 'ASC' },
      relations: this.relations,
    });
  }

  findAllAdmin(): Promise<Package[]> {
    return this.packageRepo.find({
      order: { price: 'ASC' },
      relations: this.relations,
    });
  }

  async findOne(id: number): Promise<Package> {
    const pkg = await this.packageRepo.findOne({
      where: { id },
      relations: this.relations,
    });
    if (!pkg) throw new NotFoundException(`Package #${id} not found`);
    return pkg;
  }

  async create(dto: CreatePackageDto): Promise<Package> {
    const pkg = this.packageRepo.create({
      name:         dto.name,
      description:  dto.description,
      price:        dto.price,
      days:         dto.days,
      location:     dto.location,
      difficulty:   dto.difficulty,
      category:     dto.category,
      rating:       dto.rating       ?? 5.0,
      image:        dto.image,
      badge:        dto.badge,
      tagline:      dto.tagline,
      reviewCount:  dto.reviewCount  ?? 0,
    });

    const saved = await this.packageRepo.save(pkg);

    if (dto.itineraries?.length) {
      await this.itineraryRepo.save(
        dto.itineraries.map(i =>
          this.itineraryRepo.create({ ...i, package: { id: saved.id } }),
        ),
      );
    }
    if (dto.highlights?.length) {
      await this.highlightRepo.save(
        dto.highlights.map(h =>
          this.highlightRepo.create({ ...h, package: { id: saved.id } }),
        ),
      );
    }
    if (dto.inclusions?.length) {
      await this.inclusionRepo.save(
        dto.inclusions.map(inc =>
          this.inclusionRepo.create({ ...inc, package: { id: saved.id } }),
        ),
      );
    }
    if (dto.addons?.length) {
      await this.addonRepo.save(
        dto.addons.map(a =>
          this.addonRepo.create({ ...a, package: { id: saved.id } }),
        ),
      );
    }
    if (dto.images?.length) {
      await this.imageRepo.save(
        dto.images.map((img, idx) =>
          this.imageRepo.create({ ...img, sortOrder: idx, package: { id: saved.id } }),
        ),
      );
    }

    return this.findOne(saved.id);
  }

  async findFiltered(filters: FilterPackageDto): Promise<Package[]> {
    const qb = this.packageRepo
      .createQueryBuilder('pkg')
      .leftJoinAndSelect('pkg.itineraries', 'itineraries')
      .leftJoinAndSelect('pkg.highlights',  'highlights')
      .leftJoinAndSelect('pkg.inclusions',  'inclusions')
      .leftJoinAndSelect('pkg.addons',      'addons')
      .leftJoinAndSelect('pkg.images',      'images')
      .where('pkg.isActive = :isActive', { isActive: true });

    if (filters.keyword?.trim()) {
      const kw = `%${filters.keyword.trim().toLowerCase()}%`;
      qb.andWhere(
        '(LOWER(pkg.name) LIKE :kw OR LOWER(pkg.description) LIKE :kw OR LOWER(pkg.location) LIKE :kw)',
        { kw },
      );
    }

    if (filters.minRating !== undefined)
      qb.andWhere('pkg.rating >= :minRating', { minRating: filters.minRating });

    if (filters.minPrice !== undefined)
      qb.andWhere('pkg.price >= :minPrice', { minPrice: filters.minPrice });

    if (filters.maxPrice !== undefined)
      qb.andWhere('pkg.price <= :maxPrice', { maxPrice: filters.maxPrice });

    if (filters.difficulty)
      qb.andWhere('LOWER(pkg.difficulty) = :difficulty', { difficulty: filters.difficulty.toLowerCase() });

    if (filters.minDuration !== undefined)
      qb.andWhere('pkg.days >= :minDuration', { minDuration: filters.minDuration });

    if (filters.maxDuration !== undefined)
      qb.andWhere('pkg.days <= :maxDuration', { maxDuration: filters.maxDuration });

    if (filters.freeCancellation === true)
      qb.andWhere('pkg.freeCancellation = true');

    if (filters.familyFriendly === true)
      qb.andWhere('pkg.familyFriendly = true');

    if (filters.hasDeal === true)
      qb.andWhere('pkg.hasDeal = true');

    if (filters.isNew === true)
      qb.andWhere('pkg.isNew = true');

    if (filters.category)
      qb.andWhere('LOWER(pkg.category) = :category', { category: filters.category.toLowerCase() });

    // When the user is doing a keyword search, relevance (TF-IDF) matters
    // more than the requested sort order, so we skip SQL ORDER BY here and
    // rank the results ourselves below.
    const isKeywordSearch = !!filters.keyword?.trim();
    if (!isKeywordSearch) {
      switch (filters.sortBy) {
        case 'price_asc':     qb.orderBy('pkg.price',  'ASC');  break;
        case 'price_desc':    qb.orderBy('pkg.price',  'DESC'); break;
        case 'rating_desc':   qb.orderBy('pkg.rating', 'DESC'); break;
        case 'duration_asc':  qb.orderBy('pkg.days',   'ASC');  break;
        default:              qb.orderBy('pkg.price',  'ASC');
      }
    }

    const results = await qb.getMany();

    if (isKeywordSearch) {
      // Rank the LIKE-filtered candidates by TF-IDF relevance to the
      // keyword instead of returning them in arbitrary DB order.
      return rankByKeyword(results, filters.keyword!.trim()).map((r) => r.package);
    }

    return results;
  }

  /**
   * Content-based recommendations ("You Might Also Like"): ranks every
   * other active tour by cosine similarity to the target tour's feature
   * vector (price, duration, rating, category, difficulty, location, etc.)
   * and returns the top `limit` matches. See algorithms/recommendation.util.ts
   * for the full explanation of the technique.
   */
  async getSimilarTours(id: number, limit = 3): Promise<Package[]> {
    const target = await this.findOne(id);
    const candidates = await this.packageRepo.find({
      where: { isActive: true },
      relations: this.relations,
    });
    return rankSimilarPackages(target, candidates, limit).map((r) => r.package);
  }

  async update(id: number, dto: Partial<CreatePackageDto>): Promise<Package> {
    const pkg = await this.findOne(id);
    const { itineraries, highlights, inclusions, addons, images, ...rest } = dto;
    Object.assign(pkg, rest);
    await this.packageRepo.save(pkg);

    if (itineraries) {
      await this.itineraryRepo.delete({ package: { id } });
      await this.itineraryRepo.save(
        itineraries.map(i => this.itineraryRepo.create({ ...i, package: { id } })),
      );
    }
    if (highlights) {
      await this.highlightRepo.delete({ package: { id } });
      await this.highlightRepo.save(
        highlights.map(h => this.highlightRepo.create({ ...h, package: { id } })),
      );
    }
    if (inclusions) {
      await this.inclusionRepo.delete({ package: { id } });
      await this.inclusionRepo.save(
        inclusions.map(i => this.inclusionRepo.create({ ...i, package: { id } })),
      );
    }
    if (addons) {
      await this.addonRepo.delete({ package: { id } });
      await this.addonRepo.save(
        addons.map(a => this.addonRepo.create({ ...a, package: { id } })),
      );
    }
    if (images) {
      await this.imageRepo.delete({ package: { id } });
      await this.imageRepo.save(
        images.map((img, idx) => this.imageRepo.create({ ...img, sortOrder: idx, package: { id } })),
      );
    }

    return this.findOne(id);
  }

  async toggleActive(id: number): Promise<Package> {
    const pkg = await this.findOne(id);
    pkg.isActive = !pkg.isActive;
    await this.packageRepo.save(pkg);
    return this.findOne(id);
  }

 async remove(id: number): Promise<void> {
  // Check if any bookings reference this package
  const bookingCount = await this.bookingRepo.count({
    where: { tourId: id },
  });

  if (bookingCount > 0) {
    throw new BadRequestException(
      `Cannot delete package #${id} — it has ${bookingCount} booking(s). Deactivate it instead.`
    );
  }

  const pkg = await this.findOne(id);
  await this.packageRepo.remove(pkg);
}

  findBySlug(slug: string): Promise<Package | null> {
    return this.packageRepo.findOne({
      where: { slug },
      relations: this.relations,
    });
  }
}