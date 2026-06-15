import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class JoinRoomDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  room!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  username!: string;
}
