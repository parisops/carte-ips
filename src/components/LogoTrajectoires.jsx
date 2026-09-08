export default function LogoTrajectoires({ taille = 32, animer = false }) {
  return (
    <svg
      width={taille}
      height={taille}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={animer ? "animate-[atterrissage_0.6s_ease-out]" : ""}
    >
      <defs>
        <linearGradient id="degradeJaugeLogo" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#DC2626" />
          <stop offset="50%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#16A34A" />
        </linearGradient>
      </defs>
      <path
        d="M16 2C9.4 2 4 7.4 4 14c0 8.5 10.5 15.5 11.3 16 .4.3 1 .3 1.4 0C17.5 29.5 28 22.5 28 14c0-6.6-5.4-12-12-12z"
        fill="url(#degradeJaugeLogo)"
        stroke="#12203A"
        strokeWidth="1.6"
      />
      <line x1="7.5" y1="14" x2="24.5" y2="14" stroke="#FAF7F0" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
