import { FastifyRequest, FastifyReply } from 'fastify';
import { authService } from './auth.service';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['CUSTOMER', 'VENDOR', 'ADMIN']).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const refreshTokenSchema = z.object({
  refreshToken: z.string(),
});

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const body = registerSchema.parse(request.body);

    const result = await authService.register(body);

    return reply.status(201).send({
      success: true,
      data: result,
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const body = loginSchema.parse(request.body);

    const result = await authService.login(body);

    return reply.send({
      success: true,
      data: result,
    });
  }

  async refreshToken(request: FastifyRequest, reply: FastifyReply) {
    const body = refreshTokenSchema.parse(request.body);

    const tokens = await authService.refreshToken(body.refreshToken);

    return reply.send({
      success: true,
      data: tokens,
    });
  }
}

export const authController = new AuthController();
