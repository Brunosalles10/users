import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CacheService } from '../redis/cache.service';
import { PubSubService } from '../redis/pubsub.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
    private readonly pubSubService: PubSubService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Iniciando criação de usuário: ${createUserDto.email}`);

    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      this.logger.warn(`Email já está em uso: ${createUserDto.email}`);
      throw new BadRequestException('Email já está em uso.');
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const newUser = this.userRepository.create({
      ...createUserDto,
      password: hashedPassword,
    });

    const savedUser = await this.userRepository.save(newUser);

    this.logger.log(`Novo usuário criado: ${savedUser.email}`);

    //  Invalida cache  de usuários
    await this.cacheService.del('users:all');

    // Publica evento no Redis (mensageria)
    await this.pubSubService.publish('user.created', {
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name,
    });

    this.logger.log(`Evento user.created publicado  ${savedUser.email}`);

    return savedUser;
  }

  // Retorna todos os usuários, sem a senha
  async findAll(): Promise<User[]> {
    this.logger.log('Buscando todos os usuários');

    const cacheKey = 'users:all';
    const cachedUsers = await this.cacheService.get<User[]>(cacheKey);
    if (cachedUsers) {
      this.logger.debug(`Retornando ${cachedUsers.length} usuários do cache`);
      return cachedUsers;
    }

    const users = await this.userRepository.find({
      select: ['id', 'name', 'email', 'role'],
    });

    this.logger.log(`encontrados ${users.length} usuários no banco de dados.`);

    // Salva resultado no cache por 60 segundos
    await this.cacheService.set(cacheKey, users, 60);
    return users;
  }

  // Retorna um usuário pelo ID (com cache)
  async findOne(id: number): Promise<User> {
    this.logger.log(`Buscando usuário ID: ${id}`);

    const cacheKey = `user:${id}`;
    const cachedUser = await this.cacheService.get<User>(cacheKey);

    if (cachedUser) {
      this.logger.debug(`Usuário ID ${id} retornado do cache`);
      return cachedUser;
    }

    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email', 'role'],
    });

    if (!user) {
      this.logger.warn(`Usuário com id ${id} não encontrado.`);
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }

    this.logger.log(`Usuário ID ${id} encontrado: ${user.email}`);

    // Cache de 60 segundos
    await this.cacheService.set(cacheKey, user, 60);
    return user;
  }

  // Atualiza um usuário existente, incluindo a possibilidade de alterar a senha.
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    this.logger.log(`Atualizando usuário ID: ${id}`);

    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      this.logger.warn(`Usuário com id ${id} não encontrado.`);
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }

    if (updateUserDto.password) {
      this.logger.debug(`Atualizando senha do usuário ID: ${id}`);
      updateUserDto.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    // Atualiza os campos do usuário
    Object.assign(user, updateUserDto);
    const updateUser = await this.userRepository.save(user);
    this.logger.log(`Usuário com id ${id} atualizado.`);

    // Invalida caches relacionados ao usuário atualizado
    await this.cacheService.del(`user:${id}`);
    await this.cacheService.del('users:all');

    // Publica evento de atualização de usuário
    await this.pubSubService.publish('user.updated', {
      id: updateUser.id,
      email: updateUser.email,
      name: updateUser.name,
    });

    return updateUser;
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removendo usuário ID: ${id}`);

    const result = await this.userRepository.delete(id);
    // Verifica se o usuário foi encontrado e removido
    if (result.affected === 0) {
      this.logger.error(
        `Tentativa de exclusão falhou: usuário ID ${id} não encontrado`,
      );
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }

    // Invalida caches relacionados ao usuário removido
    await this.cacheService.del(`user:${id}`);
    await this.cacheService.del('users:all');

    this.logger.log(`Usuário ID ${id} removido com sucesso`);

    // Publica evento de remoção de usuário
    await this.pubSubService.publish('user.deleted', { id });
  }

  //permite encontrar um usuário pelo email para fazer login
  async findByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'password', 'role'],
    });
  }
}
