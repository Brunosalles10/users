import { Body, Controller, Logger, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    this.logger.log(`Tentativa de login: ${loginDto.email}`);
    const result = await this.authService.login(loginDto);
    this.logger.log(`Login bem-sucedido: ${loginDto.email}`);
    return result;
  }
}
