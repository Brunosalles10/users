export interface AuthUser {
  sub: number; // ID do usuário (padrao JWT)
  email: string;
  role: string;
}
