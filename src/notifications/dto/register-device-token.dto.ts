import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4096)
  token: string;

  @IsIn(['ios', 'android'])
  platform: string;
}
