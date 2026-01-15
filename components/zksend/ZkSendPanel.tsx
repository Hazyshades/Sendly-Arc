import { SendPaymentForm } from './SendPaymentForm';
import { PendingPayments } from './PendingPayments';

export function ZkSendPanel() {
  return (
    <div className="space-y-6">
      <SendPaymentForm />
      <PendingPayments />
    </div>
  );
}

