import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.js';
import { AuthModule } from './auth/auth.js';
import { CatalogModule } from './catalog/catalog.js';
import { EsimsModule } from './esims/esims.js';
import { NotificationsModule } from './notifications/notifications.js';
import { OrdersModule } from './orders/orders.js';
import { PaymentsModule } from './payments/payments.js';
import { PrismaModule } from './prisma/prisma.service.js';
import { ProviderModule } from './provider/provider.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    ProviderModule,
    NotificationsModule,
    AuthModule,
    CatalogModule,
    OrdersModule,
    PaymentsModule,
    EsimsModule,
    AdminModule,
  ],
})
export class AppModule {}
