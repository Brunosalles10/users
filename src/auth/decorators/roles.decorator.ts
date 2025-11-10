import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

//Set metadata anexa metadados à rota, depois reolesguard vai ler e comparar com os roles do user
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
