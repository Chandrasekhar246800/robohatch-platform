import pino from 'pino';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  base: undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'token',
      'password',
      'secret',
      'accessKeyId',
      'secretAccessKey',
    ],
    remove: true,
  },
});

const normalizeArgs = (args: unknown[]) => {
  if (args.length === 0) {
    return { msg: undefined as string | undefined, meta: undefined as unknown };
  }

  if (typeof args[0] === 'string') {
    const [msg, ...rest] = args;

    if (rest.length === 0) {
      return { msg, meta: undefined as unknown };
    }

    if (rest.length === 1) {
      return { msg, meta: rest[0] };
    }

    return { msg, meta: rest };
  }

  return { msg: undefined as string | undefined, meta: args[0] };
};

const logWithLevel = (
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal',
  ...args: unknown[]
) => {
  const { msg, meta } = normalizeArgs(args);

  if (meta !== undefined && msg !== undefined) {
    (pinoLogger[level] as (obj: unknown, msg: string) => void)(meta, msg);
    return;
  }

  if (meta !== undefined) {
    (pinoLogger[level] as (obj: unknown) => void)(meta);
    return;
  }

  if (msg !== undefined) {
    (pinoLogger[level] as (msg: string) => void)(msg);
  }
};

export const logger = {
  trace: (...args: unknown[]) => logWithLevel('trace', ...args),
  debug: (...args: unknown[]) => logWithLevel('debug', ...args),
  info: (...args: unknown[]) => logWithLevel('info', ...args),
  warn: (...args: unknown[]) => logWithLevel('warn', ...args),
  error: (...args: unknown[]) => logWithLevel('error', ...args),
  fatal: (...args: unknown[]) => logWithLevel('fatal', ...args),
};
