import { useState, type FormEvent, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/authContext";
import { errorMessage } from "../graphql/errors";

/** Contraseña de los usuarios de ejemplo (seed de groups-service). */
const DEMO_PASSWORD = "quadra123";

function AuthShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: ReactNode;
}) {
  return (
    <div className="qc-auth">
      <div className="qc-card qc-auth__card">
        <p className="qc-auth__brand">quadracount</p>
        <h1 className="qc-auth__title">{title}</h1>
        <p className="qc-muted qc-auth__lead">{lead}</p>
        {children}
      </div>
    </div>
  );
}

export function LoginPage() {
  const { login, notice } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Iniciar sesión"
      lead="Entra para ver tus grupos y tus saldos."
    >
      {notice && !error && <p className="qc-notice qc-notice--error">{notice}</p>}

      <form onSubmit={submit} className="qc-auth__form">
        <label className="qc-field">
          <span className="qc-field__label">Correo</span>
          <input
            className="qc-input"
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="qc-field">
          <span className="qc-field__label">Contraseña</span>
          <input
            className="qc-input"
            type="password"
            value={password}
            autoComplete="current-password"
            required
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
          />
        </label>

        {error && <p className="qc-notice qc-notice--error">{error}</p>}

        <button
          type="submit"
          className="qc-btn qc-btn--primary qc-btn--block"
          disabled={sending}
        >
          {sending ? "Entrando…" : "Entrar"}
        </button>
      </form>

      <p className="qc-auth__switch qc-muted">
        ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
      </p>

      <p className="qc-auth__hint qc-eyebrow">
        Datos de la demo: martin@quadracount.dev · contraseña{" "}
        <span className="qc-mono">{DEMO_PASSWORD}</span>
      </p>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    try {
      await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthShell
      title="Crear cuenta"
      lead="Con tu correo podrán agregarte a los grupos."
    >
      <form onSubmit={submit} className="qc-auth__form">
        <label className="qc-field">
          <span className="qc-field__label">Nombre</span>
          <input
            className="qc-input"
            value={name}
            autoComplete="name"
            required
            onChange={(event) => {
              setName(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="qc-field">
          <span className="qc-field__label">Correo</span>
          <input
            className="qc-input"
            type="email"
            value={email}
            autoComplete="email"
            required
            onChange={(event) => {
              setEmail(event.target.value);
              setError(null);
            }}
          />
        </label>

        <label className="qc-field">
          <span className="qc-field__label">Contraseña</span>
          <input
            className="qc-input"
            type="password"
            value={password}
            autoComplete="new-password"
            minLength={8}
            required
            onChange={(event) => {
              setPassword(event.target.value);
              setError(null);
            }}
          />
        </label>

        {error && <p className="qc-notice qc-notice--error">{error}</p>}

        <button
          type="submit"
          className="qc-btn qc-btn--primary qc-btn--block"
          disabled={sending}
        >
          {sending ? "Creando…" : "Crear cuenta"}
        </button>
      </form>

      <p className="qc-auth__switch qc-muted">
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </AuthShell>
  );
}
