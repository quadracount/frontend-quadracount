import { useState } from "react";
import { Outlet } from "react-router-dom";
import { CreateGroupDialog } from "./CreateGroupDialog";
import { Sidebar } from "./Sidebar";

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
