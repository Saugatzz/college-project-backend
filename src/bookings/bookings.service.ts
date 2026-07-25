import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from 'src/entities/booking.entity';
import { CreateBookingDto } from './dto/bookings.dto';
import { MailService } from 'src/mail/mail.service';
import { EmailVerificationService } from 'src/email-verification/email-verification.service';
import { CardPaymentVerificationService } from 'src/payments/card-payment-verification.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly mailService: MailService,
    private readonly emailVerificationService: EmailVerificationService,
    private readonly cardPaymentVerificationService: CardPaymentVerificationService,
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
    this.emailVerificationService.assertVerified(dto.email, dto.emailVerificationToken);

    let cardTransactionId: string | undefined;
    let cardLast4: string | undefined;
    if (dto.paymentMethod === 'Card') {
      const verified = this.cardPaymentVerificationService.assertVerified(
        dto.cardPaymentToken,
        dto.totalAmount,
      );
      cardTransactionId = verified.transactionId;
      cardLast4 = verified.last4;
    }

    const contactMethod = dto.contactMethod ?? 'email';
    const contactValue =
      contactMethod === 'whatsapp' ? (dto.contactValue ?? dto.phone) : dto.email;

    const booking = this.bookingRepo.create({
      tourId:         dto.tourId,
      firstName:      dto.firstName,
      lastName:       dto.lastName,
      email:          dto.email,
      phone:          dto.phone,
      country:        dto.country,
      travelers:      dto.travelers,
      notes:          dto.notes,
      paymentMethod:  dto.paymentMethod,
      tourPrice:      dto.tourPrice,
      addonsTotal:    dto.addonsTotal ?? 0,
      totalAmount:    dto.totalAmount,
      selectedAddons: dto.selectedAddons ?? [],
      status:         'pending',
      contactMethod,
      contactValue,
      cardTransactionId,
      cardLast4,
    });
    const saved = await this.bookingRepo.save(booking);
    console.log('Booking saved, sending mail to:', saved.email);

    const full = await this.findOne(saved.id);

    // Customer-facing confirmation
    this.mailService.sendBookingConfirmation({
      id:            full.id,
      email:         full.email,
      firstName:     full.firstName,
      tourName:      full.tour?.name ?? 'your tour',
      travelers:     full.travelers,
      totalAmount:   full.totalAmount,
      paymentMethod: full.paymentMethod,
      departureDate: full.departureDate,
    });

    // Owner/admin notification
    this.mailService.sendOwnerNotification({
      id:            full.id,
      firstName:     full.firstName,
      lastName:      full.lastName,
      email:         full.email,
      phone:         full.phone,
      country:       full.country,
      travelers:     full.travelers,
      tourName:      full.tour?.name ?? 'a tour',
      totalAmount:   full.totalAmount,
      paymentMethod: full.paymentMethod,
      departureDate: full.departureDate,
      notes:         full.notes,
    });

    return saved;
  }

  async updateStatus(id: number, status: string): Promise<Booking> {
    const booking = await this.findOne(id);

    // Cancelled is terminal — once cancelled, status can never change again.
    if (booking.status === 'cancelled') {
      throw new BadRequestException(
        `Booking #${id} is cancelled and its status can no longer be changed.`,
      );
    }

    booking.status = status;
    const saved = await this.bookingRepo.save(booking);

    this.mailService.sendStatusUpdate({
      id:        saved.id,
      email:     saved.email,
      firstName: saved.firstName,
      tourName:  saved.tour?.name ?? 'your tour',
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
      tourName:      booking.tour?.name ?? 'your tour',
      travelers:     booking.travelers,
      totalAmount:   booking.totalAmount,
      paymentMethod: booking.paymentMethod,
      departureDate: booking.departureDate,
    });
    return { message: 'Confirmation email resent.' };
  }
}