import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useAuth } from "./auth/authContext";
import { AppLayout } from "./components/AppLayout";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { GroupPage } from "./pages/GroupPage";
import { HomePage } from "./pages/HomePage";
import { NewExpensePage } from "./pages/NewExpensePage";

/** Rutas privadas: sin sesión, redirigen a "Iniciar sesión". */
function RequireAuth() {
  const { currentUser, checking } = useAuth();
  if (checking) {
    return <p className="qc-muted qc-loading">Cargando…</p>;
  }
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
}

function RedirectIfAuth() {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RedirectIfAuth />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/grupos/:groupId" element={<GroupPage />} />
            <Route path="/grupos/:groupId/nuevo-gasto" element={<NewExpensePage />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
