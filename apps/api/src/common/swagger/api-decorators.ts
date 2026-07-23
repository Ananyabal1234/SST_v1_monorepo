import { applyDecorators } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApiErrorDto } from './api-error.dto';

/** Standard validation / bad query errors. */
export function ApiValidationError() {
  return ApiBadRequestResponse({
    description: 'Validation failed or unknown query filter',
    type: ApiErrorDto,
  });
}

/** Missing or invalid JWT. */
export function ApiAuthError() {
  return ApiUnauthorizedResponse({
    description: 'Missing or invalid Bearer token',
    type: ApiErrorDto,
  });
}

/** Role insufficient. */
export function ApiRoleError() {
  return ApiForbiddenResponse({
    description: 'Authenticated but role is not allowed for this operation',
    type: ApiErrorDto,
  });
}

/** Entity not found. */
export function ApiMissingError() {
  return ApiNotFoundResponse({
    description: 'Entity not found',
    type: ApiErrorDto,
  });
}

/** Business conflict (ineligible transition, unique constraint, etc.). */
export function ApiConflictError() {
  return ApiConflictResponse({
    description: 'Business rule conflict',
    type: ApiErrorDto,
  });
}

/** Common protected-route error set: 400/401/403. */
export function ApiProtectedErrors() {
  return applyDecorators(ApiValidationError(), ApiAuthError(), ApiRoleError());
}

/** Protected mutate set: 400/401/403/404/409. */
export function ApiMutateErrors() {
  return applyDecorators(
    ApiValidationError(),
    ApiAuthError(),
    ApiRoleError(),
    ApiMissingError(),
    ApiConflictError(),
  );
}
