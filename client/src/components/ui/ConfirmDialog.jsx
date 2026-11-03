import { useState } from 'react';
import Button from './Button';
import Modal from './Modal';

/**
 * "Are you sure?" before anything is deleted. The confirm button names the
 * action ("Delete expense") and shows a spinner while the request runs.
 * `onConfirm` may be async; the parent closes the dialog when it finishes.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  danger = true,
  onConfirm,
  onCancel,
}) {
  const [busy, setBusy] = useState(false);

  async function handleConfirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={handleConfirm} loading={busy}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="leading-relaxed">{message}</p>
    </Modal>
  );
}
