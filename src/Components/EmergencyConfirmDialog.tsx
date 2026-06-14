import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, ShieldCheck, X } from "lucide-react";
import { FormEvent, ReactNode, useState } from "react";
import "./EmergencyConfirmDialog.scss";

type EmergencyConfirmDialogProps = {
  children: ReactNode;
  description: string;
  onConfirm: () => void;
  title: string;
};

const emergencyPhrase = "CONFIRMAR";

export function EmergencyConfirmDialog({ children, description, onConfirm, title }: EmergencyConfirmDialogProps) {
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const confirmed = confirmation === emergencyPhrase;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!confirmed) {
      return;
    }

    onConfirm();
    setOpen(false);
    setConfirmation("");
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setConfirmation("");
        }
      }}
    >
      <Dialog.Trigger asChild>{children}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="emergency-confirm__overlay" />
        <Dialog.Content className="emergency-confirm">
          <Dialog.Title className="emergency-confirm__title">
            <AlertTriangle />
            {title}
          </Dialog.Title>
          <Dialog.Description className="emergency-confirm__description">{description}</Dialog.Description>
          <form className="emergency-confirm__form" onSubmit={submit}>
            <label className="field">
              Escribe CONFIRMAR
              <input
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                value={confirmation}
                onBeforeInput={(event) => {
                  const nativeEvent = event.nativeEvent as InputEvent;
                  if (nativeEvent.inputType === "insertFromPaste") {
                    event.preventDefault();
                  }
                }}
                onChange={(event) => setConfirmation(event.target.value)}
                onPaste={(event) => event.preventDefault()}
                type="text"
              />
            </label>
            <div className="modal-actions">
              <Dialog.Close asChild>
                <button className="button ghost" type="button">
                  Cancelar
                </button>
              </Dialog.Close>
              <button className="button danger" type="submit" disabled={!confirmed}>
                <ShieldCheck />
                Desbloquear
              </button>
            </div>
          </form>
          <Dialog.Close asChild>
            <button className="icon-close" aria-label="Cerrar">
              <X />
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
