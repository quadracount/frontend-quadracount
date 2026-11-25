import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { errorMessage } from "../graphql/errors";
import { CREATE_GROUP } from "../graphql/operations";
import { Dialog } from "./Dialog";

export function CreateGroupDialog({ onClose }: { onClose: () => void }) {
  const [createGroup, { loading }] = useMutation(CREATE_GROUP, {
    refetchQueries: ["MyGroups", "MyBalances", "Home"],
  });
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const trimmed = name.trim();
    if (trimmed.length === 0 || loading) return;
    try {
      const result = await createGroup({ variables: { name: trimmed } });
      onClose();
      if (result.data) navigate(`/grupos/${result.data.createGroup.id}`);
    } catch (err) {
      setError(errorMessage(err));
    }
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
            onClick={() => void submit()}
            disabled={name.trim().length === 0 || loading}
          >
            {loading ? "Creando…" : "Crear grupo"}
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
          onChange={(event) => {
            setName(event.target.value);
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") void submit();
          }}
        />
      </label>
      {error && <p className="qc-notice qc-notice--error">{error}</p>}
    </Dialog>
  );
}
