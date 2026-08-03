import { useTheme } from '../context/ThemeContext';

// Reusable BrickRed Group logo (sidebar + login).
// Dark theme swaps black wordmark text to white.
export default function Logo({ size = 40, className = '' }) {
  const { theme } = useTheme();
  const src = theme === 'dark' ? '/BR-Group-Logo-dark.png' : '/BR-Group-Logo.png';

  return (
    <img
      src={src}
      alt="BrickRed Group Logo"
      height={size}
      className={`logo ${className}`}
    />
  );
}
