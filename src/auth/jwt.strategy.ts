/* eslint-disable @typescript-eslint/no-unsafe-assignment,
   @typescript-eslint/no-unsafe-call,
   @typescript-eslint/no-unsafe-member-access */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

interface JwtPayload {
  sub: number; // ID do usuário
  email: string;
  role: string; // Role do usuário
}

// Estratégia JWT para autenticação
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), //define que o token será extraído do cabeçalho Authorization como Bearer Token
      ignoreExpiration: false, //o token expira normalmente (se o jwt tiver expiração)
      secretOrKey: process.env.JWT_SECRET || 'supersecret', // usa variável de ambiente para a chave secreta do JWT
    });
  }

  // Validação do payload do JWT, retornando os dados do usuário
  validate(payload: JwtPayload) {
    return {
      sub: payload.sub,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
