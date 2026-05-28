import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: `${config.get<number>('JWT_ACCESS_TTL_SECONDS', 900)}s`,
        },
      }),
    }),
  ],
  exports: [JwtModule],
})
export class JwtCoreModule {}
