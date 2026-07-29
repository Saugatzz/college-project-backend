import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Package } from 'src/entities/package.entity';
import { TourItinerary } from 'src/entities/tour-itinerary.entity';
import { TourHighlight } from 'src/entities/tour-highlight.entity';
import { TourInclusion } from 'src/entities/tour-inclusion.entity';
import { TourAddon } from 'src/entities/tour-addon.entity';
import { TourImage } from 'src/entities/tour-image.entity';
import { Booking } from 'src/entities/booking.entity';  // add this
import { User } from 'src/entities/user.entity';
import { PackagesService } from './package.service';
import { PackagesController } from './package.controller';
import { InteractionsModule } from 'src/interactions/interactions.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Package, TourItinerary, TourHighlight,
      TourInclusion, TourAddon, TourImage,
      Booking, User,
    ]),
    InteractionsModule,
  ],
  controllers: [PackagesController],
  providers: [PackagesService],
})
export class PackagesModule {}