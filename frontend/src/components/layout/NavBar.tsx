import { NavLink } from "react-router-dom";
import { Home, Users, UserCircle2, Settings as SettingsIcon, Gamepad2, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useSocket } from "../../context/SocketContext";
import Avatar from "../ui/Avatar";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/join", label: "Join Games", icon: Users },
  { to: "/profile", label: "Profile", icon: UserCircle2 },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
];

export default function NavBar() {
  const { username, avatarColour } = useAuth();
  const { connected } = useSocket();

  return (
    <header className="sticky top-0 z-30 border-b border-border/80 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-accent/15 p-1.5 text-accent">
            <Gamepad2 size={20} />
          </div>
          <span className="font-display text-lg font-bold tracking-tight text-ink">Minigame Hub</span>
        </div>

        <nav className="hidden items-center gap-1 rounded-xl border border-border bg-surface/60 p-1 sm:flex">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-accent text-white" : "text-ink-muted hover:bg-elevated hover:text-ink"
                }`
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <span title={connected ? "Connected" : "Disconnected"} className={connected ? "text-success" : "text-danger"}>
            {connected ? <Wifi size={16} /> : <WifiOff size={16} />}
          </span>
          {username && <Avatar username={username} colour={avatarColour} size={32} />}
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-border/60 px-2 py-1.5 sm:hidden">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                isActive ? "bg-accent/15 text-accent" : "text-ink-muted"
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
