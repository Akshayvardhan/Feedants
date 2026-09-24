import { Router, type Request, type Response, type NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel } from './models/User';
import { credentialsSchema, validateBody } from './validation';

const secret = process.env.JWT_SECRET || 'development-only-change-me';
const tokenLifetime = '7d';

declare global {
  namespace Express { interface Request { userId?: string; rawBody?: Buffer; } }
}

export interface AuthenticatedRequest extends Request { userId?: string; }

export function signToken(userId: string) {
  return jwt.sign({ sub: userId }, secret, { expiresIn: tokenLifetime });
}

export function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const value = request.header('authorization');
  if (!value?.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required', code: 'UNAUTHENTICATED' });
  try {
    const payload = jwt.verify(value.slice(7), secret) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string') throw new Error('Invalid subject');
    request.userId = payload.sub;
    return next();
  } catch { return response.status(401).json({ error: 'Invalid or expired token', code: 'UNAUTHENTICATED' }); }
}

export const authRouter = Router();

authRouter.post('/register', validateBody(credentialsSchema.required({ name: true })), async (request, response, next) => {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';
    const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
    if (!email || !name || password.length < 8) return response.status(400).json({ error: 'Name, email, and an 8-character password are required', code: 'INVALID_INPUT' });
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await UserModel.create({ email, name, passwordHash });
    return response.status(201).json({ token: signToken(user._id.toString()), user: { id: user._id.toString(), name: user.name, email: user.email } });
  } catch (error: any) {
    if (error?.code === 11000) return response.status(409).json({ error: 'An account with this email already exists', code: 'EMAIL_EXISTS' });
    return next(error);
  }
});

authRouter.post('/login', validateBody(credentialsSchema.omit({ name: true })), async (request, response, next) => {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';
    const user = await UserModel.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) return response.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    return response.json({ token: signToken(user._id.toString()), user: { id: user._id.toString(), name: user.name, email: user.email } });
  } catch (error) { return next(error); }
});