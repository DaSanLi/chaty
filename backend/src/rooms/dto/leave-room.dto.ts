import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class LeaveRoomDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  room!: string;
}
