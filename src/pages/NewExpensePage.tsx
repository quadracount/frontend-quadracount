import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Amount } from "../components/Amount";
import { Avatar } from "../components/Avatar";
import { HighlightedText } from "../components/HighlightedText";
import { useApp } from "../data/appContext";
import { formatTodayLabel } from "../lib/dates";
import { formatAmount, MINUS } from "../lib/money";
import { splitEqually, sumShares } from "../lib/split";
import type { ExpenseDraft, ExpenseSource, Member, Share } from "../lib/types";

type Tab = "TEXT" | "FORM";
type SplitMode = "EQUAL" | "CUSTOM";

function referenceShare(shares: Share[]): number {
  const counts = new Map<number, number>();
  for (const share of shares) {
    counts.set(share.amount, (counts.get(share.amount) ?? 0) + 1);
  }
  let reference = shares[0]?.amount ?? 0;
  let best = 0;
  for (const [amount, count] of counts) {
    if (count > best || (count === best && amount > reference)) {
      reference = amount;
      best = count;
    }
  }
  return reference;
}

export function NewExpensePage() {
  const { groupId = "" } = useParams();
  const navigate = useNavigate();
  const { getGroup, currentUser, now, parseExpenseText, createExpense } = useApp();

  const group = getGroup(groupId);

  const [tab, setTab] = useState<Tab>("TEXT");
  const [text, setText] = useState("");
  const [textPayer, setTextPayer] = useState(currentUser?.id ?? "");
  const [draft, setDraft] = useState<ExpenseDraft | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [description, setDescription] = useState("");
  const [amountText, setAmountText] = useState("");
  const [formPayer, setFormPayer] = useState(currentUser?.id ?? "");
  const [splitMode, setSplitMode] = useState<SplitMode>("EQUAL");
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [origin, setOrigin] = useState<ExpenseSource>("MANUAL");

  const amount = Number(amountText.replace(/[.\s$]/g, "")) || 0;

  const formShares = useMemo<Share[]>(() => {
    if (!group) return [];
    if (splitMode === "EQUAL") return splitEqually(amount, group.members);
    return group.members.map((member) => ({
      userId: member.userId,
      name: member.name,
      amount: Number(customShares[member.userId]?.replace(/[.\s$]/g, "")) || 0,
    }));
  }, [group, splitMode, amount, customShares]);

  const formTotal = sumShares(formShares);
  const formMatches = formTotal === amount && amount > 0;

  if (!group || !currentUser) {
    return (
      <div className="qc-section">
        <h1 className="qc-page-title">Grupo no encontrado</h1>
        <p className="qc-muted">
          <Link to="/">Volver a Inicio</Link>
        </p>
      </div>
    );
  }

  const memberOf = (userId: string): Member =>
    group.members.find((member) => member.userId === userId) ?? group.members[0];

  const interpret = () => {
    if (text.trim().length === 0) return;
    setError(null);
    setDraft(parseExpenseText(group.id, text, textPayer));
  };

  const saveDraft = () => {
    if (!draft) return;
    const result = createExpense({
      groupId: group.id,
      description: draft.description,
      amount: draft.amount,
      paidBy: draft.paidBy.userId,
      shares: draft.shares.map((share) => ({
        userId: share.userId,
        amount: share.amount,
      })),
      source: "ASSISTANT",
    });
    if (result.ok) navigate(`/grupos/${group.id}`);
    else setError(result.message);
  };

  const adjustByHand = () => {
    if (!draft) return;
    setDescription(draft.description);
    setAmountText(String(draft.amount));
    setFormPayer(draft.paidBy.userId);
    setSplitMode("CUSTOM");
    setCustomShares(
      Object.fromEntries(
        draft.shares.map((share) => [share.userId, String(share.amount)]),
      ),
    );
    setOrigin("ASSISTANT");
    setDraft(null);
    setTab("FORM");
  };

  const saveForm = () => {
    const result = createExpense({
      groupId: group.id,
      description,
      amount,
      paidBy: formPayer,
      shares: formShares.map((share) => ({
        userId: share.userId,
        amount: share.amount,
      })),
      source: origin,
    });
    if (result.ok) navigate(`/grupos/${group.id}`);
    else setError(result.message);
  };

  const payerOptions = group.members.map((member) => (
    <option key={member.userId} value={member.userId}>
      {member.userId === currentUser.id ? `Tú (${member.name})` : member.name}
    </option>
  ));

  return (
    <>
      <header className="qc-page-header qc-page-header--stacked">
        <div>
          <Link to={`/grupos/${group.id}`} className="qc-back">
            ← {group.name}
          </Link>
          <h1 className="qc-page-title">Nuevo gasto</h1>
        </div>
      </header>

      <div className="qc-card qc-compose">
        <div className="qc-tabs qc-tabs--underline" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "TEXT"}
            className={`qc-tab ${tab === "TEXT" ? "qc-tab--active" : ""}`}
            onClick={() => setTab("TEXT")}
          >
            Texto libre
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "FORM"}
            className={`qc-tab ${tab === "FORM" ? "qc-tab--active" : ""}`}
            onClick={() => setTab("FORM")}
          >
            Formulario
          </button>
        </div>

        {tab === "TEXT" ? (
          <>
            <div className="qc-compose__body">
              <label className="qc-field">
                <span className="qc-field__label">
                  Cuéntalo como se lo dirías a tus compañeros
                </span>
                <textarea
                  className="qc-textarea qc-textarea--bare"
                  value={text}
                  autoFocus
                  rows={3}
                  placeholder="Compré mercadería y útiles de aseo por 45 lucas, Diego pone 5 lucas menos porque no come carne y el resto en partes iguales"
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      interpret();
                    }
                  }}
                />
              </label>
            </div>

            <div className="qc-compose__footer">
              <label className="qc-inline-field">
                <span className="qc-field__label">Pagó</span>
                <select
                  className="qc-select qc-select--inline"
                  value={textPayer}
                  onChange={(event) => setTextPayer(event.target.value)}
                >
                  {payerOptions}
                </select>
              </label>

              <span className="qc-muted qc-compose__date">{formatTodayLabel(now)}</span>

              <button
                type="button"
                className="qc-btn qc-btn--primary"
                onClick={interpret}
                disabled={text.trim().length === 0}
              >
                Interpretar <kbd className="qc-kbd">⌘↵</kbd>
              </button>
            </div>
          </>
        ) : (
          <div className="qc-compose__body qc-form">
            <label className="qc-field">
              <span className="qc-field__label">Descripción</span>
              <input
                className="qc-input"
                value={description}
                placeholder="Internet noviembre"
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>

            <div className="qc-form__row">
              <label className="qc-field">
                <span className="qc-field__label">Monto total</span>
                <input
                  className="qc-input qc-mono"
                  inputMode="numeric"
                  value={amountText}
                  placeholder="24000"
                  onChange={(event) =>
                    setAmountText(event.target.value.replace(/[^\d.]/g, ""))
                  }
                />
              </label>

              <label className="qc-field">
                <span className="qc-field__label">Pagó</span>
                <select
                  className="qc-select"
                  value={formPayer}
                  onChange={(event) => setFormPayer(event.target.value)}
                >
                  {payerOptions}
                </select>
              </label>
            </div>

            <fieldset className="qc-form__split">
              <legend className="qc-field__label">División</legend>
              <div className="qc-tabs qc-tabs--pill">
                <button
                  type="button"
                  className={`qc-tab ${splitMode === "EQUAL" ? "qc-tab--active" : ""}`}
                  onClick={() => setSplitMode("EQUAL")}
                >
                  Partes iguales
                </button>
                <button
                  type="button"
                  className={`qc-tab ${splitMode === "CUSTOM" ? "qc-tab--active" : ""}`}
                  onClick={() => {
                    setCustomShares(
                      Object.fromEntries(
                        splitEqually(amount, group.members).map((share) => [
                          share.userId,
                          String(share.amount),
                        ]),
                      ),
                    );
                    setSplitMode("CUSTOM");
                  }}
                >
                  Montos a mano
                </button>
              </div>

              <ul className="qc-split-list">
                {group.members.map((member) => {
                  const share = formShares.find(
                    (candidate) => candidate.userId === member.userId,
                  );
                  return (
                    <li className="qc-split-list__row" key={member.userId}>
                      <Avatar member={member} />
                      <span className="qc-split-list__name">
                        {member.userId === currentUser.id ? "Tú" : member.name}
                      </span>
                      {splitMode === "CUSTOM" ? (
                        <input
                          className="qc-input qc-mono qc-split-list__input"
                          inputMode="numeric"
                          value={customShares[member.userId] ?? ""}
                          onChange={(event) =>
                            setCustomShares((previous) => ({
                              ...previous,
                              [member.userId]: event.target.value.replace(/[^\d]/g, ""),
                            }))
                          }
                        />
                      ) : (
                        <Amount value={share?.amount ?? 0} />
                      )}
                    </li>
                  );
                })}
              </ul>

              <p className="qc-split-total">
                <span className="qc-muted">Suma de las partes</span>
                <span
                  className={`qc-mono ${formMatches ? "qc-credit" : "qc-debt"}`}
                >
                  {formMatches ? "✓ cuadra con el monto" : "no cuadra con el monto"} ·{" "}
                  {formatAmount(formTotal)}
                </span>
              </p>
            </fieldset>

            {error && <p className="qc-notice qc-notice--error">{error}</p>}

            <div className="qc-draft__actions">
              <button
                type="button"
                className="qc-btn qc-btn--primary"
                onClick={saveForm}
                disabled={!formMatches || description.trim().length === 0}
              >
                Guardar gasto
              </button>
              <Link to={`/grupos/${group.id}`} className="qc-btn qc-btn--ghost">
                Cancelar
              </Link>
            </div>
          </div>
        )}
      </div>

      {draft && (
        <section className="qc-section">
          <p className="qc-draft__status">
            <span className="qc-draft__dot" aria-hidden="true" />
            <strong>Borrador</strong>
            <span className="qc-muted">
              {" "}
              · sin guardar, revísalo antes de confirmar
            </span>
          </p>

          <div className="qc-card qc-draft">
            <div className="qc-draft__reading">
              <HighlightedText text={text} interpretations={draft.interpretations} />
              <ol className="qc-draft__interpretations">
                {draft.interpretations.map((interpretation) => (
                  <li key={interpretation.phrase} className="qc-mono">
                    {interpretation.meaning}
                  </li>
                ))}
              </ol>
            </div>

            <table className="qc-table qc-draft__table">
              <caption className="qc-draft__caption">
                <span>
                  {draft.description} · pagó{" "}
                  {draft.paidBy.userId === currentUser.id ? "Tú" : draft.paidBy.name}
                </span>
                <span className="qc-num">Parte</span>
              </caption>
              <tbody>
                {draft.shares.map((share) => {
                  const reference = referenceShare(draft.shares);
                  const delta = share.amount - reference;
                  return (
                    <tr key={share.userId}>
                      <td>
                        <span className="qc-paid-by">
                          <Avatar member={memberOf(share.userId)} />
                          {share.userId === currentUser.id ? "Tú" : share.name}
                        </span>
                      </td>
                      <td className="qc-num qc-mono qc-muted">
                        {delta !== 0
                          ? `${delta < 0 ? MINUS : "+"}${formatAmount(delta)}`
                          : ""}
                      </td>
                      <td className="qc-num">
                        <Amount value={share.amount} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <th scope="row">Total</th>
                  <td className="qc-num">
                    <span className={draft.sumMatches ? "qc-credit" : "qc-debt"}>
                      {draft.sumMatches ? "✓ cuadra con el monto" : "no cuadra"}
                    </span>
                  </td>
                  <td className="qc-num">
                    <Amount value={draft.amount} />
                  </td>
                </tr>
              </tfoot>
            </table>

            {error && <p className="qc-notice qc-notice--error">{error}</p>}

            <div className="qc-draft__actions">
              <button
                type="button"
                className="qc-btn qc-btn--primary"
                onClick={saveDraft}
                disabled={!draft.sumMatches || draft.amount === 0}
              >
                Guardar gasto
              </button>
              <button type="button" className="qc-btn" onClick={adjustByHand}>
                Ajustar a mano
              </button>
              <button
                type="button"
                className="qc-btn qc-btn--ghost"
                onClick={() => setDraft(null)}
              >
                Descartar
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
