import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InteractionType, UserInteraction } from 'src/entities/user-interaction.entity';

// Base weight per interaction type. A completed booking is a much
// stronger taste signal than simply viewing a tour page, so it counts
// for several "views" worth of interest when we aggregate history for
// recommendations.
const WEIGHTS: Record<InteractionType, number> = {
  view: 1,
  book: 5,
};

// How many of the user's most recent interactions feed the
// recommendation engine. Bounds the aggregation query and keeps
// recommendations reflecting *recent* taste rather than everything
// they've ever clicked on.
const MAX_HISTORY = 200;

export interface WeightedTourInteraction {
  tourId: number;
  weight: number;
}

@Injectable()
export class InteractionsService {
  constructor(
    @InjectRepository(UserInteraction)
    private readonly repo: Repository<UserInteraction>,
  ) {}

  async record(userId: string, tourId: number, type: InteractionType): Promise<void> {
    const interaction = this.repo.create({
      userId,
      tourId,
      type,
      weight: WEIGHTS[type],
    });
    await this.repo.save(interaction);
  }

  /**
   * Returns this user's interaction history aggregated (summed) by tour,
   * highest weight first — e.g. a tour they viewed 3 times and booked
   * once will outweigh a tour they only viewed once. Used to build the
   * "taste profile" behind personalized recommendations.
   */
  async getAggregatedForUser(userId: string): Promise<WeightedTourInteraction[]> {
    const recent = await this.repo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: MAX_HISTORY,
    });

    const totals = new Map<number, number>();
    for (const i of recent) {
      totals.set(i.tourId, (totals.get(i.tourId) ?? 0) + i.weight);
    }

    return Array.from(totals.entries())
      .map(([tourId, weight]) => ({ tourId, weight }))
      .sort((a, b) => b.weight - a.weight);
  }
}
