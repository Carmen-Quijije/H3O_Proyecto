import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import { Database } from './database';
export function token(id: number) { return sign({sub: id}, process.env.JWT_SECRET!, {expiresIn:'12h',issuer:'h3o'}); }
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private db: Database) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    try {
      const raw = String(req.headers.authorization || '');
      if (!raw.startsWith('Bearer ')) throw new Error();
      const data = verify(raw.slice(7), process.env.JWT_SECRET!, {issuer:'h3o',algorithms:['HS256']}) as any;
      const result = await this.db.query('SELECT * FROM users WHERE id=$1',[Number(data.sub)]);
      if (!result.rows[0]) throw new Error(); req.user = result.rows[0]; return true;
    } catch { throw new UnauthorizedException('Inicia sesión nuevamente'); }
  }
}
