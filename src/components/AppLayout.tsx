import { useState } from "react";
import { Outlet } from "react-router-dom";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { Sidebar } from "./Sidebar";

/**
 * Estructura de las pantallas privadas: barra lateral fija y el contenido de
 * la ruta. En pantallas angostas la barra lateral se apila arriba
 * (CLAUDE.md, sección 7).
 */
export function AppLayout() {
  const [creatingGroup, setCreatingGroup] = useState(false);

  return (
    <div className="qc-shell">
      <Sidebar onCreateGroup={() => setCreatingGroup(true)} />
      <main className="qc-main">
        <Outlet />
      </main>
      {creatingGroup && <CreateGroupDialog onClose={() => setCreatingGroup(false)} />}
    </div>
  );
}
