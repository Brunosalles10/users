import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CacheService } from '../redis/cache.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';
import { HandlePostActionsUtil } from './utils/handlePostActions';
import { UserValidationUtil } from './utils/user-validation.utils';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cacheService: CacheService,
    private readonly handlePostActionsUtil: HandlePostActionsUtil,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    this.logger.log(`Iniciando criação de usuário: ${createUserDto.email}`);

    await UserValidationUtil.ensureEmailIsUnique(
      this.userRepository,
      createUserDto.email,
    );

    // Cria a instância
    const newUser = this.userRepository.create(createUserDto);
    const savedUser = await this.userRepository.save(newUser);

    this.logger.log(`Novo usuário criado com sucesso: ${savedUser.email}`);

    await this.handlePostActionsUtil.execute(savedUser, 'created');

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

    const user = await UserValidationUtil.findUserOrFail(
      this.userRepository,
      id,
    );

    // Cache de 60 segundos
    await this.cacheService.set(cacheKey, user, 60);
    return user;
  }

  // Atualiza um usuário existente, incluindo a possibilidade de alterar a senha.
  async update(id: number, dto: UpdateUserDto): Promise<User> {
    this.logger.log(`Atualizando usuário ID: ${id}`);

    const user = await UserValidationUtil.findUserOrFail(
      this.userRepository,
      id,
    );
    await UserValidationUtil.ensureEmailIsUnique(
      this.userRepository,
      dto.email,
      id,
      user.email,
    );

    Object.assign(user, dto);

    const updatedUser = await this.userRepository.save(user);

    await this.handlePostActionsUtil.execute(updatedUser, 'updated');
    return updatedUser;
  }

  async remove(id: number): Promise<void> {
    this.logger.log(`Removendo usuário ID: ${id}`);

    await UserValidationUtil.findUserOrFail(this.userRepository, id);
    await this.userRepository.delete(id);

    this.logger.log(`Usuário ID ${id} removido.`);

    // Invalida caches e publica evento de deleção
    await this.handlePostActionsUtil.execute({ id }, 'deleted');
  }

  //permite encontrar um usuário pelo email para fazer login
  async findByEmail(email: string) {
    return await this.userRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'password', 'role'],
    });
  }
}
