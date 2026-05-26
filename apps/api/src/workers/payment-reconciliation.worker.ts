import { prisma } from '../config/prisma';
import { PaymentService } from '../services/payment.service';
import { logger } from '../utils/logger';

const paymentService = new PaymentService();

const RECONCILIATION_INTERVAL_MS = 5 * 60 * 1000;
const STUCK_PAYMENT_MINUTES = 10;

export async function runPaymentReconciliationOnce() {
  const cutoff = new Date(Date.now() - STUCK_PAYMENT_MINUTES * 60 * 1000);

  logger.info(
    `🔎 Running payment reconciliation for payments older than ${STUCK_PAYMENT_MINUTES} minutes...`
  );

  const candidatePayments = await prisma.payment.findMany({
    where: {
      status: {
        in: ['PENDING', 'CREATED', 'AUTHORIZED'],
      },
      createdAt: {
        lt: cutoff,
      },
    },
    select: {
      orderId: true,
      id: true,
      status: true,
      gatewayPaymentId: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 100,
  });

  if (candidatePayments.length === 0) {
    logger.info('✅ No stuck payments detected');
    return {
      scanned: 0,
      reconciled: 0,
      failed: 0,
    };
  }

  let reconciled = 0;
  let failed = 0;

  for (const candidate of candidatePayments) {
    try {
      const result = await paymentService.reconcileOrderPayment(
        candidate.orderId,
        `reconciliation:${candidate.id}`
      );

      if (result.success && (result.status === 'CAPTURED' || result.status === 'FAILED')) {
        reconciled += 1;
        logger.info(`✅ Reconciled payment ${candidate.id} -> ${result.status}`);
      }
    } catch (error: any) {
      failed += 1;
      logger.error(`❌ Reconciliation failed for payment ${candidate.id}:`, error?.message || error);
    }
  }

  logger.info(
    `✅ Payment reconciliation complete. scanned=${candidatePayments.length}, reconciled=${reconciled}, failed=${failed}`
  );

  return {
    scanned: candidatePayments.length,
    reconciled,
    failed,
  };
}

export function startPaymentReconciliationWorker() {
  logger.info(
    `🚀 Starting payment reconciliation worker (checks every ${RECONCILIATION_INTERVAL_MS / 1000 / 60} minutes)`
  );

  runPaymentReconciliationOnce().catch((error) => {
    logger.error('❌ Initial payment reconciliation run failed:', error);
  });

  setInterval(() => {
    runPaymentReconciliationOnce().catch((error) => {
      logger.error('❌ Scheduled payment reconciliation run failed:', error);
    });
  }, RECONCILIATION_INTERVAL_MS);
}

export default {
  start: startPaymentReconciliationWorker,
  runOnce: runPaymentReconciliationOnce,
};
