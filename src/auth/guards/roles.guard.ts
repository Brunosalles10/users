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

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
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
      this.logger.debug('Rota pública sem restrição de roles');
      return true;
    }

    // Extrai informações da requisição
    const request = context.switchToHttp().getRequest<{
      user: AuthUser;
      params: { id?: string };
      method: string; // Método HTTP (GET, POST, etc.)
      url: string; // URL da requisição
    }>();

    const { user } = request;
    const route = `${request.method} ${request.url}`;

    this.logger.log(`Verificando permissões para: ${route}`);
    this.logger.debug(`Roles necessárias: [${requiredRoles.join(', ')}]`);

    // validação de usuario não encontrado ou sem role
    if (!user || !user.role) {
      this.logger.error(
        `ACESSO NEGADO: Usuário não autenticado ou sem role definida`,
      );
      throw new ForbiddenException(
        'Acesso negado: usuário não possui permissões necessárias',
      );
    }

    this.logger.debug(
      `Usuário autenticado: ${user.email} (ID: ${user.sub}, Role: ${user.role})`,
    );

    // Verifica se o usuário tem uma das roles necessárias
    const hasRequiredRole = requiredRoles.includes(user.role);

    if (hasRequiredRole) {
      this.logger.log(
        `ACESSO PERMITIDO: Usuário possui role "${user.role}" necessária`,
      );
      return true; // Se tiver a role (ex: admin), libera.
    }

    // Se não tiver a role, verifica se é o dono do recurso
    const resourceIdParam = request.params.id;

    if (!resourceIdParam) {
      this.logger.warn(
        `ACESSO NEGADO: Usuário "${user.role}" não possui permissão.`,
      );
      throw new ForbiddenException(
        `Acesso negado: necessário ter uma das roles [${requiredRoles.join(', ')}]`,
      );
    }

    const resourceId = parseInt(resourceIdParam, 10);
    // Valida se o ID do recurso é um número válido
    if (isNaN(resourceId)) {
      this.logger.error(`ERRO: ID do recurso inválido (${resourceIdParam})`);
      throw new ForbiddenException('ID do recurso inválido');
    }

    // Comparação: verifica se é o dono do recurso
    const userId = Number(user.sub);
    const isOwner = userId === resourceId;
    this.logger.debug(
      `Verificando propriedade do recurso: User ID ${userId} === Resource ID ${resourceId}? ${isOwner}`,
    );

    if (isOwner) {
      this.logger.log(
        `ACESSO PERMITIDO: Usuário ${user.email} é o dono do recurso (ID: ${resourceId})`,
      );
      return true;
    }

    // Acesso negado: não tem role nem é o dono
    this.logger.warn(
      `ACESSO NEGADO: Usuário ${user.email} (role: ${user.role}) tentou acessar recurso ID ${resourceId} sem permissão`,
    );
    throw new ForbiddenException(
      `Acesso negado: você não tem permissão para acessar este recurso`,
    );
  }
}
