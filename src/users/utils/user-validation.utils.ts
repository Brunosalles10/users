import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

export class UserValidationUtil {
  private static readonly logger = new Logger(UserValidationUtil.name);
  static async findUserOrFail(
    userRepository: Repository<User>,
    id: number,
  ): Promise<User> {
    this.logger.debug(`Verificando existência do usuário ID: ${id}`);
    const user = await userRepository.findOne({ where: { id } });
    if (!user) {
      this.logger.warn(`Usuário não encontrado: ID ${id}`);
      throw new NotFoundException(`Usuário com id ${id} não encontrado.`);
    }
    this.logger.log(`Usuário encontrado: ${user.email} (ID: ${user.id})`);
    return user;
  }

  static async ensureEmailIsUnique(
    userRepository: Repository<User>,
    newEmail?: string,
    userId?: number,
    currentEmail?: string,
  ): Promise<void> {
    if (!newEmail || newEmail === currentEmail) return;

    const existing = await userRepository.findOne({
      where: { email: newEmail },
    });
    if (existing && existing.id !== userId) {
      this.logger.warn(
        `E-mail já em uso por outro usuário (ID: ${existing.id}) → ${newEmail}`,
      );
      throw new BadRequestException('E-mail já está em uso.');
    }
  }

  static handleDuplicateError(error: any): never {
    const isDuplicate = error?.code === '23505';
    if (isDuplicate) {
      this.logger.error(
        `Erro de unicidade detectado: ${error.detail || 'E-mail duplicado.'}`,
      );
      throw new BadRequestException('E-mail já cadastrado.');
    }
    this.logger.error(`Erro inesperado: ${error.message}`, error.stack);
    throw error;
  }
}
