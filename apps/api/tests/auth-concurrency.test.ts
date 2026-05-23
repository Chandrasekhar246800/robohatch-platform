import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test, { before } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PORT = process.env.PORT || '5001';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://user:pass@localhost:3306/robohatch_test';
process.env.JWT_SECRET = process.env.JWT_SECRET || '0123456789abcdef0123456789abcdef';
process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'fedcba9876543210fedcba9876543210';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
process.env.BCRYPT_ROUNDS = process.env.BCRYPT_ROUNDS || '12';
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'test-sendgrid-key';
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
process.env.AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'test-aws-key';
process.env.AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'test-aws-secret';
process.env.AWS_REGION = process.env.AWS_REGION || 'us-east-1';
process.env.AWS_S3_BUCKET = process.env.AWS_S3_BUCKET || 'robohatch-test-bucket';
process.env.RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'test-razorpay-key';
process.env.RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'test-razorpay-secret';
process.env.RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || 'test-razorpay-webhook';

let AuthServiceClass: typeof import('../src/services/auth.service').AuthService;
let prisma: typeof import('../src/config/prisma').prisma;

before(async () => {
  const serviceModule = await import('../src/services/auth.service');
  const prismaModule = await import('../src/config/prisma');

  AuthServiceClass = serviceModule.AuthService;
  prisma = prismaModule.prisma;
});

type RefreshRow = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  lastUsedAt: Date | null;
};

type FakeState = {
  refreshRows: RefreshRow[];
  user: {
    id: string;
    email: string;
    name: string | null;
    role: 'USER';
  };
};

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const hash = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

const createService = () => {
  const service = new AuthServiceClass() as AuthService & Record<string, any>;
  service.verifyRefreshToken = async () => ({ userId: 'user-1' });
  service.generateToken = () => 'access-token';
  service.generateCSRFToken = () => 'csrf-token';
  return service;
};

const withPrismaMock = async <T>(mock: Record<string, any>, callback: () => Promise<T>) => {
  const originalTransaction = prisma.$transaction;

  (prisma as any).$transaction = mock.$transaction;

  try {
    return await callback();
  } finally {
    (prisma as any).$transaction = originalTransaction;
  }
};

test('refresh rotation: two simultaneous refreshes using same token allow only one success', async () => {
  const refreshToken = 'refresh-token-1';
  const state: FakeState = {
    refreshRows: [{
      id: 'row-1',
      userId: 'user-1',
      tokenHash: hash(refreshToken),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      lastUsedAt: null,
    }],
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      role: 'USER',
    },
  };

  let rotationCount = 0;
  let lock = Promise.resolve();

  const mock = {
    user: {
      findUnique: async () => state.user,
    },
    refreshToken: {
      updateMany: async ({ where, data }: any) => {
        await sleep(5);
        const row = state.refreshRows.find((candidate) =>
          candidate.tokenHash === where.tokenHash &&
          candidate.userId === where.userId &&
          candidate.revokedAt === where.revokedAt &&
          candidate.expiresAt > where.expiresAt.gt
        );

        if (!row || row.revokedAt !== null) {
          return { count: 0 };
        }

        row.revokedAt = data.revokedAt;
        row.lastUsedAt = data.lastUsedAt;
        return { count: 1 };
      },
      create: async ({ data }: any) => {
        state.refreshRows.push({
          id: `row-${state.refreshRows.length + 1}`,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          revokedAt: null,
          lastUsedAt: null,
        });
        return data;
      },
    },
    $transaction: async (callback: (tx: any) => Promise<any>) => {
      const previous = lock;
      let release!: () => void;
      lock = new Promise<void>((resolve) => {
        release = resolve;
      });

      await previous;

      try {
        return await callback({
          user: mock.user,
          refreshToken: mock.refreshToken,
        });
      } finally {
        release();
      }
    },
  };

  await withPrismaMock(mock, async () => {
    const service = createService() as any;
    service.generateRefreshToken = () => `rotated-refresh-${++rotationCount}`;

    const [first, second] = await Promise.allSettled([
      service.refreshSession(refreshToken),
      service.refreshSession(refreshToken),
    ]);

    const fulfilledCount = [first, second].filter((result) => result.status === 'fulfilled').length;
    const rejectedCount = [first, second].filter((result) => result.status === 'rejected').length;

    assert.equal(fulfilledCount, 1);
    assert.equal(rejectedCount, 1);
    assert.equal(state.refreshRows[0].revokedAt !== null, true);
    assert.equal(state.refreshRows.length, 2);

    await assert.rejects(() => service.refreshSession(refreshToken));
  });
});

test('refresh rotation: transaction rollback leaves the old token usable', async () => {
  const refreshToken = 'refresh-token-rollback';
  const state: FakeState = {
    refreshRows: [{
      id: 'row-1',
      userId: 'user-1',
      tokenHash: hash(refreshToken),
      expiresAt: new Date(Date.now() + 60_000),
      revokedAt: null,
      lastUsedAt: null,
    }],
    user: {
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
      role: 'USER',
    },
  };

  const snapshot = () => structuredClone(state) as FakeState;

  const mock = {
    user: {
      findUnique: async () => state.user,
    },
    refreshToken: {
      updateMany: async ({ where, data }: any) => {
        const row = state.refreshRows.find((candidate) =>
          candidate.tokenHash === where.tokenHash &&
          candidate.userId === where.userId &&
          candidate.revokedAt === where.revokedAt &&
          candidate.expiresAt > where.expiresAt.gt
        );

        if (!row || row.revokedAt !== null) {
          return { count: 0 };
        }

        row.revokedAt = data.revokedAt;
        row.lastUsedAt = data.lastUsedAt;
        return { count: 1 };
      },
      create: async ({ data }: any) => {
        state.refreshRows.push({
          id: `row-${state.refreshRows.length + 1}`,
          userId: data.userId,
          tokenHash: data.tokenHash,
          expiresAt: data.expiresAt,
          revokedAt: null,
          lastUsedAt: null,
        });
        return data;
      },
    },
    $transaction: async (callback: (tx: any) => Promise<any>) => {
      const workingState = snapshot();
      const tx = {
        user: {
          findUnique: async () => workingState.user,
        },
        refreshToken: {
          updateMany: async ({ where, data }: any) => {
            const row = workingState.refreshRows.find((candidate) =>
              candidate.tokenHash === where.tokenHash &&
              candidate.userId === where.userId &&
              candidate.revokedAt === where.revokedAt &&
              candidate.expiresAt > where.expiresAt.gt
            );

            if (!row || row.revokedAt !== null) {
              return { count: 0 };
            }

            row.revokedAt = data.revokedAt;
            row.lastUsedAt = data.lastUsedAt;
            return { count: 1 };
          },
          create: async ({ data }: any) => {
            workingState.refreshRows.push({
              id: `row-${workingState.refreshRows.length + 1}`,
              userId: data.userId,
              tokenHash: data.tokenHash,
              expiresAt: data.expiresAt,
              revokedAt: null,
              lastUsedAt: null,
            });
            return data;
          },
        },
      };

      const originalState = snapshot();

      try {
        const result = await callback(tx);
        state.refreshRows = workingState.refreshRows;
        return result;
      } catch (error) {
        state.refreshRows = originalState.refreshRows;
        throw error;
      }
    },
  };

  await withPrismaMock(mock, async () => {
    const service = createService() as any;
    service.generateRefreshToken = () => {
      throw new Error('simulated create failure');
    };

    await assert.rejects(() => service.refreshSession(refreshToken), /simulated create failure/);
    assert.equal(state.refreshRows[0].revokedAt, null);
    assert.equal(state.refreshRows.length, 1);

    service.generateRefreshToken = () => 'rotated-refresh-success';
    const result = await service.refreshSession(refreshToken);
    assert.equal(result.refreshToken, 'rotated-refresh-success');
    assert.equal(state.refreshRows.length, 2);
  });
});

test('refresh rotation: malformed refresh token fails before touching the database', async () => {
  let transactionCalls = 0;

  const mock = {
    user: {
      findUnique: async () => ({
        id: 'user-1',
        email: 'user@example.com',
        name: 'User',
        role: 'USER',
      }),
    },
    refreshToken: {
      updateMany: async () => ({ count: 1 }),
      create: async () => ({ id: 'row-2' }),
    },
    $transaction: async (callback: (tx: any) => Promise<any>) => {
      transactionCalls += 1;
      return callback({
        user: mock.user,
        refreshToken: mock.refreshToken,
      });
    },
  };

  await withPrismaMock(mock, async () => {
    const service = createService() as any;
    service.verifyRefreshToken = async () => {
      throw new Error('Invalid or expired refresh token');
    };

    await assert.rejects(() => service.refreshSession('malformed-refresh-token'), /Invalid or expired refresh token/);
    assert.equal(transactionCalls, 0);
  });
});