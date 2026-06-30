interface AvatarProps {
  username: string;
  colour: string;
  size?: number;
  ring?: boolean;
}

export default function Avatar({ username, colour, size = 36, ring }: AvatarProps) {
  const initial = username.trim().charAt(0).toUpperCase() || "?";
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full font-display font-semibold text-white ${ring ? "ring-2 ring-accent ring-offset-2 ring-offset-bg" : ""}`}
      style={{ width: size, height: size, backgroundColor: colour, fontSize: size * 0.42 }}
    >
      {initial}
    </div>
  );
}
