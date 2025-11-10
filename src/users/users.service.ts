import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { CacheService } from '../redis/cache.service';
import { PubSubService } from '../redis/pubsub.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

// Serviço responsável pela lógica de negócios relacionada aos usuários
@Injectable()
export class UsersService {
  constructor(
    // Injeção do repositório do TypeORM para a entidade User
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
    private readonly pubSubService: PubSubService,
  ) {}

  // Logger para registrar eventos e erros
  private readonly logger = new Logger(UsersService.name);

  // Cria um novo usuário, json com nome, email e senha
  async create(createUserDto: CreateUserDto): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: createUserDto.email },
    });

    // Verifica se o email já está em uso
    if (existingUser) {
      this.logger.warn(`Email já está em uso: ${createUserDto.email}`);
      throw new BadRequestException('Email já está em uso.');
    }

    // Hash da senha antes de salvar no banco de dados, o parametro 10 é o custo hash
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
    const cacheKey = 'users:all';
    const cachedUsers = await this.cacheService.get<User[]>(cacheKey);
    if (cachedUsers) {
      return cachedUsers;
    }

    const users = await this.userRepository.find({
      select: ['id', 'name', 'email'], // não retorna senha
    });

    this.logger.log(`encontrados ${users.length} usuários no banco de dados.`);

    // Salva resultado no cache por 60 segundos
    await this.cacheService.set(cacheKey, users, 60);
    return users;
  }

  // Retorna um usuário pelo ID (com cache)
  async findOne(id: number): Promise<User> {
    const cacheKey = `user:${id}`;
    const cachedUser = await this.cacheService.get<User>(cacheKey);

    if (cachedUser) {
      return cachedUser;
    }

    const user = await this.userRepository.findOne({
      where: { id },
      select: ['id', 'name', 'email'],
    });

    if (!user) {
      this.logger.warn(`Usuário com id ${id} não encontrado.`);
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }

    // Cache de 60 segundos
    await this.cacheService.set(cacheKey, user, 60);
    return user;
  }

  // Atualiza um usuário existente, incluindo a possibilidade de alterar a senha
  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn(`Usuário com id ${id} não encontrado.`);
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }

    if (updateUserDto.password) {
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

  // Remove um usuário pelo ID
  async remove(id: number): Promise<void> {
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
    return await this.userRepository.findOne({ where: { email } });
  }
}
