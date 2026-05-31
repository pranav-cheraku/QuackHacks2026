import logoSrc from "@/assets/logo.png";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <img
      src={logoSrc}
      alt="Projektor"
      width={size}
      height={size}
      style={{ display: "block", objectFit: "contain" }}
    />
  );
}
