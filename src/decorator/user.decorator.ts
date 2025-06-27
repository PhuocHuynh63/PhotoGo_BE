import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // Thông tin người dùng từ token (được gán bởi AuthGuard)
    return data ? user?.[data] : user;
  },
);

export const CurrentUser = GetUser; // Alias for better readability

export const CurrentUserId = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // Thông tin người dùng từ token (được gán bởi AuthGuard)
    return data ? user?.[data] : user?.userId;
  },
);

export const CurrentUserEmail = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // Thông tin người dùng từ token (được gán bởi AuthGuard)
    return data ? user?.[data] : user?.email;
  },
);