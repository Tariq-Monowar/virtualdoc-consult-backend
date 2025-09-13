import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { FaqModule } from './faq/faq.module';
import { SupportModule } from './support/support.module';
import { AppointmentModule } from './appointment/appointment.module';
import { UserDashboardModule } from './user-dashboard/user-dashboard.module';

import { CoachDashboardModule } from './coach-dashboard/coach-dashboard.module';
import { BlogModule } from './blog/blog.module';
import { ReviewModule } from './review/review.module';
import { AdminDashboardModule } from './admin-dashboard/admin-dashboard.module';
import { WalletModule } from './wallet/wallet.module';
import { RefundModule } from './refund/refund.module';
import { WithdrawModule } from './withdraw/withdraw.module';

@Module({
  imports: [NotificationModule, ContactModule, FaqModule, SupportModule, AppointmentModule, UserDashboardModule, CoachDashboardModule, BlogModule, ReviewModule, AdminDashboardModule, WalletModule, RefundModule, WithdrawModule],
})
export class ApplicationModule { }
