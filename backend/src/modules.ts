import { Module } from '@nestjs/common';
import { Database } from './database';
import { AuthGuard } from './auth';
import { PushService } from './push';
import { AuthController, AppController } from './controllers';
@Module({providers:[Database],exports:[Database]})
export class DatabaseModule {}
@Module({imports:[DatabaseModule],controllers:[AuthController],providers:[AuthGuard],exports:[AuthGuard]})
export class AuthModule {}
@Module({imports:[DatabaseModule],providers:[PushService],exports:[PushService]})
export class NotificationsModule {}
@Module({imports:[DatabaseModule,AuthModule,NotificationsModule],controllers:[AppController]})
export class HabitsModule {}
