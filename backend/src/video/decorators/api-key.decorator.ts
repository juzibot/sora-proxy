import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const ApiKey = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    // 从请求头中获取 API Key
    return request.headers['x-api-key'] || request.headers['x-openai-key'];
  },
);

