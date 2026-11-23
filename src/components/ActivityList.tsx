import { formatRelativeShort } from "../lib/dates";
import type { ActivityEntry } from "../lib/types";

/**
 * Resalta el sujeto al principio de la frase. El texto llega ya redactado
 * desde activity-service, así que solo se marca el prefijo si coincide con
 * el actor ("Sofía agregó…", "Tú agregaste…").
 */
function withSubject(entry: ActivityEntry) {
  const prefixes = [entry.actorName, "Tú", "Le"];
  for (const prefix of prefixes) {
    if (entry.text.startsWith(prefix)) {
      return {
        subject: prefix,
        rest: entry.text.slice(prefix.length),
      };
    }
  }
  return { subject: "", rest: entry.text };
}

export function ActivityList({
  entries,
  now,
  showGroup = false,
}: {
  entries: ActivityEntry[];
  now: Date;
  showGroup?: boolean;
}) {
  if (entries.length === 0) {
    return <p className="qc-muted qc-empty">Todavía no hay actividad.</p>;
  }

  return (
    <ul className="qc-activity">
      {entries.map((entry) => {
        const { subject, rest } = withSubject(entry);
        return (
          <li className="qc-activity__item" key={entry.id}>
            <span className="qc-mono qc-activity__when">
              {formatRelativeShort(entry.createdAt, now)}
            </span>
            <span className="qc-activity__text">
              {subject && <strong>{subject}</strong>}
              {rest}
              {showGroup && entry.groupName && (
                <span className="qc-muted"> · {entry.groupName}</span>
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
