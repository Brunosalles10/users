import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  //injeção de dependências
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  //valida o usuário pelo email e senha
  async validateUser(email: string, password: string) {
    //busca o usuário pelo email
    const user = await this.usersService.findByEmail(email);

    //compara a senha informada com a senha armazenada
    if (user && (await bcrypt.compare(password, user.password))) {
      //password cridada para evitar o retorno da senha
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...result } = user;
      return result;
    }

    //se não encontrar o usuário ou a senha for inválida, retorna null
    return null;
  }

  //realiza o login do usuário
  async login(loginDto: LoginDto) {
    //busca o usuário pelo email
    const user = await this.usersService.findByEmail(loginDto.email);

    //se o usuário não for encontrado, lança uma exceção
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    //verifica se a senha informada é válida
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    //se a senha for inválida, lança uma exceção
    if (!isPasswordValid) {
      throw new UnauthorizedException('Senha inválida');
    }

    //cria o payload do token JWT
    const payload = { sub: user.id, email: user.email, role: user.role };

    //retorna o token JWT e os dados do usuário
    return {
      access_token: this.jwtService.sign(payload), //usara o segredo definido no módulo de autenticação
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
