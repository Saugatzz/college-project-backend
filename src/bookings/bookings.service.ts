import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from 'src/entities/booking.entity';
import { CreateBookingDto } from './dto/bookings.dto';
import { MailService } from 'src/mail/mail.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly mailService: MailService,
  ) {}

  findAll(): Promise<Booking[]> {
    return this.bookingRepo.find({
      relations: { tour: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({
      where: { id },
      relations: { tour: true },
    });
    if (!booking) throw new NotFoundException(`Booking #${id} not found`);
    return booking;
  }

  async create(dto: CreateBookingDto): Promise<Booking> {
    const booking = this.bookingRepo.create({
      tourId:        dto.tourId,
      firstName:     dto.firstName,
      lastName:      dto.lastName,
      email:         dto.email,
      phone:         dto.phone,
      country:       dto.country,
      travelers:     dto.travelers,
      notes:         dto.notes,
      paymentMethod: dto.paymentMethod,
      tourPrice:     dto.tourPrice,
      addonsTotal:   dto.addonsTotal ?? 0,
      totalAmount:   dto.totalAmount,
      selectedAddons: dto.selectedAddons ?? [],
      status:        'pending',
    });
    const saved = await this.bookingRepo.save(booking);
    console.log('Booking saved, sending mail to:', saved.email); 

    // fetch with tour relation for email
    const full = await this.findOne(saved.id);
    this.mailService.sendBookingConfirmation({
      id:            full.id,
      email:         full.email,
      firstName:     full.firstName,
      tourName:      full.tour?.name ?? full.tour?.name ?? 'your tour',
      travelers:     full.travelers,
      totalAmount:   full.totalAmount,
      paymentMethod: full.paymentMethod,
      departureDate: full.departureDate,
    });

    return saved;
  }

  async updateStatus(id: number, status: string): Promise<Booking> {
    const booking = await this.findOne(id);
    booking.status = status;
    const saved = await this.bookingRepo.save(booking);

    this.mailService.sendStatusUpdate({
      id:        saved.id,
      email:     saved.email,
      firstName: saved.firstName,
      tourName:  saved.tour?.name ?? saved.tour?.name ?? 'your tour',
      status:    saved.status,
    });

    return saved;
  }

  async saveReceiptPath(id: number, path: string): Promise<Booking> {
    const booking = await this.findOne(id);
    booking.receiptPath = path;
    return this.bookingRepo.save(booking);
  }
  async resendConfirmation(id: number): Promise<{ message: string }> {
  const booking = await this.findOne(id);
  await this.mailService.sendBookingConfirmation({
    id:            booking.id,
    email:         booking.email,
    firstName:     booking.firstName,
    tourName:      booking.tour?.name ?? booking.tour?.name ?? 'your tour',
    travelers:     booking.travelers,
    totalAmount:   booking.totalAmount,
    paymentMethod: booking.paymentMethod,
    departureDate: booking.departureDate,
  });
  return { message: 'Confirmation email resent.' };
}
}