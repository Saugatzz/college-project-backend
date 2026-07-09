import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateContactDto } from './dto/contact.dto';
import { Contact } from 'src/entities/contact.entity';

@Injectable()
export class ContactsService {
  constructor(
    @InjectRepository(Contact)
    private readonly contactRepo: Repository<Contact>,
  ) {}

  async findAll(): Promise<Contact[]> {
    return this.contactRepo.find({ order: { createdAt: 'DESC' } });
  }

  async findOne(id: number): Promise<Contact> {
    const contact = await this.contactRepo.findOne({ where: { id } });
    if (!contact) throw new NotFoundException(`Contact #${id} not found`);
    return contact;
  }

  async create(dto: CreateContactDto): Promise<Contact> {
    const contact = this.contactRepo.create(dto);
    return this.contactRepo.save(contact);
  }

  async markRead(id: number): Promise<Contact> {
    const contact = await this.findOne(id);
    contact.read = true;
    return this.contactRepo.save(contact);
  }

  async remove(id: number): Promise<void> {
    const contact = await this.findOne(id);
    await this.contactRepo.remove(contact);
  }
}