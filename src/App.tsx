import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { AppProvider } from "./data/AppProvider";
import { useApp } from "./data/appContext";
import { LoginPage, RegisterPage } from "./pages/AuthPages";
import { GroupPage } from "./pages/GroupPage";
import { HomePage } from "./pages/HomePage";
import { NewExpensePage } from "./pages/NewExpensePage";

/** Las rutas de la app son privadas: sin sesión, redirigen a iniciar sesión. */
function RequireAuth() {
  const { currentUser } = useApp();
  return currentUser ? <Outlet /> : <Navigate to="/login" replace />;
}

/** Con sesión iniciada, las pantallas de acceso llevan de vuelta a Inicio. */
function RedirectIfAuth() {
  const { currentUser } = useApp();
  return currentUser ? <Navigate to="/" replace /> : <Outlet />;
}

export default function App() {
  return (
    <AppProvider>
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
    </AppProvider>
  );
}
