export function Logo({ size = 20 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="rounded-full flex items-center justify-center"
        style={{ width: size, height: size, background: "var(--accent-teal)" }}
      >
        <svg
          width={size * 0.45}
          height={size * 0.45}
          viewBox="0 0 10 10"
          fill="white"
        >
          <polygon points="2,1 9,5 2,9" />
        </svg>
      </div>
      <span
        className="font-extrabold tracking-tight text-ink"
        style={{ fontWeight: 800, fontSize: 15 }}
      >
        Projektor
      </span>
    </div>
  );
}
