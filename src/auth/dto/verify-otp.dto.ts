import { Length, Matches } from 'class-validator';

export class VerifyOtpDto {
  @Matches(/^(\+90|0)?5\d{9}$/, {
    message: 'Geçerli bir cep telefonu numarası gir',
  })
  phone: string;

  @Length(6, 6, { message: 'Doğrulama kodu 6 haneli olmalı' })
  @Matches(/^\d{6}$/, { message: 'Doğrulama kodu yalnızca rakamlardan oluşur' })
  code: string;
}
