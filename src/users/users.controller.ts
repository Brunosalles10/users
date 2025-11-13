import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller('users')
@ApiBearerAuth('JWT-auth') // Indica que esta rota usa autenticação Bearer JWT
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  //lista todos os usuários
  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin') //Somente usuários com a role 'admin' podem acessar esta rota
  findAll() {
    this.logger.log('Listando todos os usuários');
    return this.usersService.findAll();
  }

  //Rota protegida que retorna o perfil do usuário autenticado, usando o AuthGuard com estratégia JWT
  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Request() req: Request & { user: AuthUser }) {
    this.logger.log(`Buscando perfil do usuário ID: ${req.user.sub}`);
    return this.usersService.findOne(req.user.sub);
  }

  //Busca usuario por ID, parseIntPipe garante que o id será um número
  @Get(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'user') //Usuários com role 'admin' ou 'user' podem acessar esta rota
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  //httpCode define o código de resposta HTTP
  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateUserDto) {
    this.logger.log(`Criando novo usuário: ${dto.email}`);
    return this.usersService.create(dto);
  }

  //Está rota atualiza um usuário específico
  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'user') //Usuários com role 'admin' ou 'user' podem acessar esta rota
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    this.logger.log(`Atualizando usuário ID: ${id}`);
    return this.usersService.update(id, dto);
  }

  //Está rota remove um usuário específico, retornando código 204 (No Content)
  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin', 'user') //Usuários com role 'admin' ou 'user' podem acessar esta rota
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Removendo usuário ID: ${id}`);
    return this.usersService.remove(id);
  }
}
