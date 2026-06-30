import { Routes, Route, Navigate } from "react-router-dom";
import NavBar from "./components/layout/NavBar";
import AuthGate from "./components/AuthGate";
import ToastContainer from "./components/ToastContainer";
import Home from "./pages/Home";
import JoinGames from "./pages/JoinGames";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import LobbyPage from "./pages/LobbyPage";

export default function App() {
  return (
    <AuthGate>
      <div className="min-h-screen">
        <NavBar />
        <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/join" element={<JoinGames />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/lobby/:lobbyId" element={<LobbyPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </AuthGate>
  );
}
