import { IsEmail, IsString, Length, IsInt, Min, Max, IsBoolean, Matches, IsUrl, IsOptional } from 'class-validator';
export class RegisterDto {
  @IsEmail() @Length(3,254) email!: string;
  @IsString() @Length(10,100) password!: string;
  @IsString() @Length(2,80) name!: string;
}
export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @Length(1,100) password!: string;
}
export class IntakeDto { @IsInt() @Min(1) @Max(5000) ml!: number; }
export class SettingsDto {
  @IsString() @Length(2,80) name!: string;
  @IsInt() @Min(250) @Max(10000) goal!: number;
  @IsString() @Length(1,100) timezone!: string;
  @IsInt() @Min(15) @Max(240) frequency!: number;
  @IsInt() @Min(0) @Max(1439) start_min!: number;
  @IsInt() @Min(0) @Max(1439) end_min!: number;
  @IsBoolean() reminders!: boolean;
  // Opcionales para permitir que una pestaña de la versión anterior siga guardando su perfil.
  @IsOptional() @IsBoolean() active_breaks?: boolean;
  @IsOptional() @IsInt() @Min(0) @Max(1439) break_first_min?: number;
  @IsOptional() @IsInt() @Min(0) @Max(1439) break_second_min?: number;
}
export class SubscriptionDto {
  @IsUrl({protocols:['https'],require_protocol:true}) @Length(10,2048) endpoint!: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{87,88}$/) p256dh!: string;
  @IsString() @Matches(/^[A-Za-z0-9_-]{22,24}$/) auth!: string;
}
export class EndpointDto { @IsString() @Length(10,2048) endpoint!: string; }
