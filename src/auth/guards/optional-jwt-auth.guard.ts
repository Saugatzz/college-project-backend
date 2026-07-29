// src/auth/guards/optional-jwt-auth.guard.ts
//
// Same JWT verification as JwtAuthGuard, but never rejects the request
// when no token (or an invalid one) is present — it just leaves
// req.user undefined. Used on routes that behave for both guests and
// logged-in users, but personalize/attribute data when a user IS logged
// in (e.g. booking creation, tour view tracking, recommendations).
import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    // Deliberately swallow errors/missing-user instead of throwing —
    // that's the entire point of this guard being "optional".
    return user || null;
  }

  getRequest(context: ExecutionContext) {
    return context.switchToHttp().getRequest();
  }
}
