// src/bookings/booking.controller.ts
import {
  Controller, Get, Post, Patch, Param, Body, Req,
  ParseIntPipe, HttpCode, HttpStatus, UseGuards,
  UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import type { Request } from 'express';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.gurds';
import { OptionalJwtAuthGuard } from 'src/auth/guards/optional-jwt-auth.guard';
import {
  CreateBookingDto,
  UpdateBookingStatusDto,
  UpdateGuideCoordinationDto,
  UpdateMyBookingDto,
} from './dto/bookings.dto';


@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll() {
    return this.bookingsService.findAll();
  }

  // The logged-in user's own bookings — matched by account id, falling
  // back to email for guest bookings made before they had an account.
  // Declared before ':id' so "my" is never parsed as a booking id.
  @Get('my')
  @UseGuards(JwtAuthGuard)
  findMine(@Req() req: Request) {
    const user = req.user as any;
    return this.bookingsService.findMyBookings(user.id, user.email);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.bookingsService.findOne(id);
  }

  // Self-service: a logged-in customer cancelling their own booking.
  // Only works while the booking is still 'pending' — enforced in the
  // service layer, along with a strict ownership check by userId.
  // Declared before the generic ':id/status' admin route sits — no
  // path collision either way since 'my' vs a numeric id never match
  // the same segment, but keeping "my" routes grouped together.
  @Patch('my/:id/cancel')
  @UseGuards(JwtAuthGuard)
  cancelMine(@Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const user = req.user as any;
    return this.bookingsService.cancelMyBooking(id, user.id);
  }

  // Self-service: edit trip details (travelers, timing, contact, notes)
  // on your own booking while it's still 'pending'. Payment/pricing
  // fields are intentionally not editable here.
  @Patch('my/:id')
  @UseGuards(JwtAuthGuard)
  updateMine(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMyBookingDto,
    @Req() req: Request,
  ) {
    const user = req.user as any;
    return this.bookingsService.updateMyBooking(id, user.id, dto);
  }

  // Guests can still book without an account (OptionalJwtAuthGuard never
  // blocks the request) — but if the person happens to be logged in, the
  // booking is attributed to their account and counted toward their
  // personalized recommendations.
  @Post()
  @UseGuards(OptionalJwtAuthGuard)
  create(@Body() dto: CreateBookingDto, @Req() req: Request) {
    const user = req.user as any;
    return this.bookingsService.create(dto, user?.id ?? null);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, dto.status);
  }

  // Admin-only: track / advance guide coordination for a booking's
  // preferred start window. Emails the customer on every change.
  @Patch(':id/guide-status')
  updateGuideCoordination(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateGuideCoordinationDto,
  ) {
    return this.bookingsService.updateGuideCoordination(id, dto);
  }

  // Upload PDF receipt for Khalti / eSewa payments
  @Post(':id/receipt')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('receipt', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'receipts'),
        filename: (_req, file, cb) => {
          const unique = `${Date.now()}-${Math.round(Math.random() * 1e6)}`;
          cb(null, `receipt-${unique}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (file.mimetype !== 'application/pdf') {
          cb(new BadRequestException('Only PDF files are accepted'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  )
  uploadReceipt(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const relativePath = `uploads/receipts/${file.filename}`;
    return this.bookingsService.saveReceiptPath(id, relativePath);
  }

  @Post(':id/resend-confirmation')
  async resendConfirmation(@Param('id') id: string) {
    return this.bookingsService.resendConfirmation(+id);
  }
}