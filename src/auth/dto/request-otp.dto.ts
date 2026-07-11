import { Matches } from 'class-validator';

export class RequestOtpDto {
  /** Türkiye cep formatı: +905XXXXXXXXX veya 05XXXXXXXXX */
  @Matches(/^(\+90|0)?5\d{9}$/, {
    message: 'Geçerli bir cep telefonu numarası gir',
  })
  phone: string;
}
