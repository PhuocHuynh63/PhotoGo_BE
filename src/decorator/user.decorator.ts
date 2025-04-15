import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user; // Thông tin người dùng từ token (được gán bởi AuthGuard)
    return data ? user?.[data] : user;
  },
);