// Reusable BrickRed Group logo (sidebar + login).
export default function Logo({ size = 40, className = '' }) {
  return (
    <img
      src="/BR-Group-Logo.png"
      alt="BrickRed Group Logo"
      height={size}
      className={`logo ${className}`}
    />
  );
}
