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
@ApiBearerAuth('JWT-auth')
export class UsersController {
  private readonly logger = new Logger(UsersController.name);
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
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
  @Roles('admin')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED) //httpCode define o código de resposta HTTP
  create(@Body() dto: CreateUserDto) {
    this.logger.log(`Criando novo usuário: ${dto.email}`);
    return this.usersService.create(dto);
  }

  @Patch(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin') //Usuários com role 'admin' ou 'user' podem acessar esta rota
  @HttpCode(HttpStatus.NO_CONTENT) //Retorna 204 No Content em caso de sucesso
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
