import { CHAT_TURN_CREDIT_COST_LABEL } from '../../constants';

export function ChatTurnCreditCost() {
  return (
    <span className="shrink-0 text-xs text-foreground-secondary">
      {CHAT_TURN_CREDIT_COST_LABEL}
    </span>
  );
}
