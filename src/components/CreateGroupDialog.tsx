import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "../data/appContext";
import { Dialog } from "./Dialog";

export function CreateGroupDialog({ onClose }: { onClose: () => void }) {
  const { createGroup } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState("");

  const submit = () => {
    const trimmed = name.trim();
    if (trimmed.length === 0) return;
    const group = createGroup(trimmed);
    onClose();
    navigate(`/grupos/${group.id}`);
  };

  return (
    <Dialog
      title="Nuevo grupo"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="qc-btn" onClick={onClose}>
            Cancelar
          </button>
          <button
            type="button"
            className="qc-btn qc-btn--primary"
            onClick={submit}
            disabled={name.trim().length === 0}
          >
            Crear grupo
          </button>
        </>
      }
    >
      <p className="qc-muted qc-dialog__lead">
        Quedas como primer miembro. Después puedes agregar a los demás por su
        correo.
      </p>
      <label className="qc-field">
        <span className="qc-field__label">Nombre del grupo</span>
        <input
          className="qc-input"
          value={name}
          autoFocus
          placeholder="Depto Los Carrera 1450"
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
        />
      </label>
    </Dialog>
  );
}
