import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../interfaces/auth-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  //Verifica se o user tem a role necessária para acessar a rota
  //Lê os metadados anexados pela Roles decorator
  //Retorna true se o user tiver a role necessária, false caso contrário
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      return true; // Se a rota não exigir roles, libera
    }

    //tipagem do request para incluir o user com a interface AuthUser
    const request = context.switchToHttp().getRequest<{ user: AuthUser }>();
    const { user } = request;

    if (!user || !user.role) {
      return false; // Usuário sem role não tem permissão
    }

    return requiredRoles.includes(user.role);
  }
}
