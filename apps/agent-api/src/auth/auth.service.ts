import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto, LoginDto } from './auth.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // 检查用户名是否已存在
    const existing = await this.prisma.user.findUnique({
      where: { username: registerDto.username },
    });
    if (existing) {
      throw new ConflictException('用户名已存在');
    }

    // 哈希密码
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username: registerDto.username,
        password: hashedPassword,
      },
    });

    // 签发 JWT
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  async login(loginDto: LoginDto) {
    // 查找用户
    const user = await this.prisma.user.findUnique({
      where: { username: loginDto.username },
    });
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 签发 JWT
    const payload = { sub: user.id, username: user.username };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }
}
