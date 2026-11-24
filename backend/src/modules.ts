import { Module } from '@nestjs/common';
import { Database } from './database';
import { AuthGuard } from './auth';
import { PushService } from './push';
import { AuthController, AppController } from './controllers';
import { RewardsService } from './rewards';
import { RewardsController } from './rewards.controller';
@Module({providers:[Database],exports:[Database]})
export class DatabaseModule {}
@Module({imports:[DatabaseModule],controllers:[AuthController],providers:[AuthGuard],exports:[AuthGuard]})
export class AuthModule {}
@Module({imports:[DatabaseModule],providers:[PushService],exports:[PushService]})
export class NotificationsModule {}
@Module({imports:[DatabaseModule,AuthModule],providers:[RewardsService],controllers:[RewardsController]})
export class RewardsModule {}
@Module({imports:[DatabaseModule,AuthModule,NotificationsModule,RewardsModule],controllers:[AppController]})
export class HabitsModule {}
