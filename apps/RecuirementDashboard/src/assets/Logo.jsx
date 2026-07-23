// Reusable logo. Uses the organization's real logo (BR-Group-Logo.png) from /public.
export default function Logo({ size = 40, className = '' }) {
  return (
    <img
      src="/BR-Group-Logo.png"
      alt="BR Group Logo"
      width={size}
      height={size}
      className={`logo ${className}`}
    />
  );
}
