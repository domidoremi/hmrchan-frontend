export type TurnstileWidgetStatus =
  | 'idle'
  | 'executing'
  | 'interactive_required'
  | 'verified'
  | 'expired'
  | 'error'

export function isTurnstileBusy(status: TurnstileWidgetStatus): boolean {
  return status === 'executing' || status === 'interactive_required'
}
