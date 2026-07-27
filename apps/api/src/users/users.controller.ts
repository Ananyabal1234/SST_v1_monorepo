import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '../prisma/client';
import { UsersService } from './users.service';
import { CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, AuthUser } from '../auth/decorators/current-user.decorator';
import {
  ApiMutateErrors,
  ApiProtectedErrors,
} from '../common/swagger/api-decorators';
import { OkResponseDto } from '../common/swagger/api-error.dto';

@ApiTags('Users')
@ApiBearerAuth('bearer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Roles(
    Role.ADMIN,
    Role.SALES,
    Role.TA,
    Role.HR,
  )
  @Get('directory')
  @ApiOperation({
    operationId: 'listUserDirectory',
    summary: 'Active users directory (for owner pickers)',
  })
  @ApiOkResponse({ description: 'Directory entries' })
  @ApiProtectedErrors()
  directory(@Query('role') role?: Role): Promise<any> {
    return this.users.directory(role);
  }

  @Roles(Role.ADMIN)
  @Get('roles')
  @ApiOperation({
    operationId: 'listAssignableRoles',
    summary: 'Role dropdown options for create-user (Admin)',
  })
  @ApiOkResponse({
    description:
      'Returns key "role" and options (SALES/TA/HR/… with Sales Owner labels)',
  })
  @ApiProtectedErrors()
  listRoles() {
    return this.users.listRoleOptions();
  }

  @Roles(Role.ADMIN)
  @Get()
  @ApiOperation({
    operationId: 'listUsers',
    summary: 'Paginated users (Admin)',
  })
  @ApiOkResponse({ description: 'Paginated user list' })
  @ApiProtectedErrors()
  list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('role') role?: Role,
    @Query('isActive') isActive?: string,
    @Query('q') q?: string,
  ): Promise<any> {
    let activeFilter: boolean | undefined;
    if (isActive === 'true') activeFilter = true;
    else if (isActive === 'false') activeFilter = false;

    return this.users.list(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 50,
      role,
      activeFilter,
      q,
    );
  }

  @Roles(Role.ADMIN)
  @Post()
  @ApiOperation({ operationId: 'createUser', summary: 'Create user (Admin)' })
  @ApiCreatedResponse({ description: 'Created user' })
  @ApiMutateErrors()
  create(@Body() dto: CreateUserDto, @CurrentUser() user: AuthUser): Promise<any> {
    return this.users.create(dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  @ApiOperation({
    operationId: 'updateUser',
    summary: 'Update role / active flag (Admin)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'Updated user' })
  @ApiMutateErrors()
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: AuthUser,
  ): Promise<any> {
    return this.users.update(id, dto, user.id);
  }

  @Roles(Role.ADMIN)
  @Post(':id/reset-password')
  @ApiOperation({
    operationId: 'resetUserPassword',
    summary: 'Set temporary password (Admin)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OkResponseDto })
  @ApiMutateErrors()
  resetPassword(
    @Param('id') id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.users.resetPassword(id, dto.password, user.id);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  @ApiOperation({
    operationId: 'deleteUser',
    summary: 'Deactivate / remove user (Admin)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ description: 'User removed' })
  @ApiMutateErrors()
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.users.remove(id, user.id);
  }
}
