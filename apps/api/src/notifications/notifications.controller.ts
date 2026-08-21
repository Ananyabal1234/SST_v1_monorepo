import { Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../prisma/client';
import { NotificationService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import { ApiProtectedErrors } from '../common/swagger/api-decorators';

@ApiTags('Notifications')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.SALES,
  Role.SALES_LEAD,
  Role.TA,
  Role.TA_LEAD,
  Role.HR,
  Role.HR_LEAD,
)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationService) {}

  @Get()
  @ApiOperation({
    operationId: 'listNotifications',
    summary: 'Current user notifications (unread first)',
  })
  @ApiOkResponse({ description: 'Notification list + unreadCount' })
  @ApiProtectedErrors()
  list(@CurrentUser() user: AuthUser): Promise<{ items: any[]; unreadCount: number }> {
    return this.notifications.listForUser(user.id);
  }

  @Patch(':id/read')
  @ApiOperation({
    operationId: 'markNotificationRead',
    summary: 'Mark one notification as read',
  })
  @ApiOkResponse({ description: 'Updated list' })
  @ApiProtectedErrors()
  markRead(
    @Param('id') id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<{ items: any[]; unreadCount: number }> {
    return this.notifications.markRead(user.id, id);
  }

  @Post('read-all')
  @ApiOperation({
    operationId: 'markAllNotificationsRead',
    summary: 'Mark all notifications as read',
  })
  @ApiOkResponse({ description: 'Updated list' })
  @ApiProtectedErrors()
  markAll(
    @CurrentUser() user: AuthUser,
  ): Promise<{ items: any[]; unreadCount: number }> {
    return this.notifications.markAllRead(user.id);
  }
}
