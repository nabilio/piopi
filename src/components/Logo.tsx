type LogoProps = {
  size?: number;
  className?: string;
};

export function Logo({ size = 40, className = '' }: LogoProps) {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 font-bold text-white shadow-lg ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.6 }}
    >
      P
    </div>
  );
}
