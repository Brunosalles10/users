import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthUser } from '../interfaces/auth-user.interface';

interface RequestWithUser {
  user: AuthUser;
  params: { id?: string };
  method: string;
  url: string;
}

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const { user, method, url, params } = request;
    const route = `${method} ${url}`;

    this.logger.log(`Verificando permissões para: ${route}`);

    if (!requiredRoles) return this.allow(`Rota pública: ${route}`);

    if (!user?.role) this.deny('Usuário não autenticado ou sem role definida');

    if (this.hasRole(user.role, requiredRoles))
      return this.allow(`Usuário com role "${user.role}" permitida`);

    const resourceId = Number(params.id);
    if (!params.id || Number.isNaN(resourceId))
      this.deny('Você não tem permissão para acessar este recurso');

    if (this.isOwner(user.sub, resourceId))
      return this.allow(
        `Usuário ${user.email} é dono do recurso ${resourceId}`,
      );

    this.deny(
      `Usuário ${user.email} (role: ${user.role}) tentou acessar recurso ${resourceId} sem permissão`,
    );
  }

  private hasRole(userRole: string, roles: string[]): boolean {
    return roles.includes(userRole);
  }

  private isOwner(userId: string | number, resourceId: number): boolean {
    return Number(userId) === resourceId;
  }

  private allow(mensagem: string): boolean {
    this.logger.log(`ACESSO PERMITIDO: ${mensagem}`);
    return true;
  }

  private deny(motivo: string): never {
    this.logger.warn(`ACESSO NEGADO: ${motivo}`);
    throw new ForbiddenException('Acesso negado: permissões insuficientes');
  }
}
