import { getInitials } from '@/lib/utils';

interface StudentAvatarProps {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

export function StudentAvatar({ name, size = 'md' }: StudentAvatarProps) {
  const initials = getInitials(name);

  // Using the student-specific blue color scheme from our design system
  const colors = [
    'bg-blue-500/15 text-blue-600',
    'bg-blue-500/20 text-blue-600',
    'bg-blue-600/25 text-blue-600',
  ];
  
  // Use the name to consistently pick a color
  const colorIndex = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  const colorClass = colors[colorIndex];

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
    lg: 'h-12 w-12 text-base',
  };

  return (
    <div className={`rounded-full flex items-center justify-center font-medium ${colorClass} ${sizeClasses[size]}`}>
      {initials}
    </div>
  );
}
