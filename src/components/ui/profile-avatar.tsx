import { getInitials } from '@/lib/utils';

interface ProfileAvatarProps {
  email: string;
  role: 'lecturer' | 'student' | 'admin';
  onClick?: () => void;
  className?: string;
}

export function ProfileAvatar({ email, role, onClick, className = '' }: ProfileAvatarProps) {
  const initials = getInitials(email);

  const roleColors = {
    lecturer: 'bg-green-500/15 text-green-600 hover:bg-green-600/25',
    student: 'bg-blue-500/15 text-blue-600 hover:bg-blue-600/25',
    admin: 'bg-purple-500/15 text-purple-600 hover:bg-purple-600/25'
  }[role];

  return (
    <div 
      className={`flex items-center justify-center w-10 h-10 rounded-full font-medium cursor-pointer transition-colors ${roleColors} ${className}`}
      title={email}
      onClick={onClick}
    >
      {initials}
    </div>
  );
}
