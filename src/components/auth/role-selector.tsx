import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, ShieldCheck, QrCode } from 'lucide-react';

export function RoleSelector() {
  const navigate = useNavigate();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const roles = [
    {
      id: 'student',
      title: 'Student',
      icon: GraduationCap,
      color: 'bg-blue-500',
      hoverColor: 'hover:bg-blue-600',
      shadowColor: 'shadow-blue-500/20',
      description: 'Mark your attendance and track your class history',
      model: 'https://cdn.jsdelivr.net/gh/pmndrs/market-assets@latest/models/graduation-cap/model.gltf',
    },
    {
      id: 'lecturer',
      title: 'Lecturer',
      icon: Users,
      color: 'bg-green-500',
      hoverColor: 'hover:bg-green-600',
      shadowColor: 'shadow-green-500/20',
      description: 'Manage classes and monitor student attendance',
      model: 'https://cdn.jsdelivr.net/gh/pmndrs/market-assets@latest/models/desk/model.gltf',
    },
    {
      id: 'admin',
      title: 'Admin',
      icon: ShieldCheck,
      color: 'bg-purple-500',
      hoverColor: 'hover:bg-purple-600',
      shadowColor: 'shadow-purple-500/20',
      description: 'System administration and user management',
      model: 'https://cdn.jsdelivr.net/gh/pmndrs/market-assets@latest/models/shield/model.gltf',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header with Logo */}
      <div className="absolute top-0 left-0 w-full p-6">
        <div className="container mx-auto">
          <div className="flex items-center space-x-2">
            <QrCode className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AttendanceQR
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            Welcome to{' '}
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              AttendanceQR
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
            A modern attendance tracking system using QR codes. Simple, fast, and reliable.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => navigate(`/login/${role.id}`)}
                onMouseEnter={() => setHoveredCard(role.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`
                  relative overflow-hidden rounded-2xl transition-all duration-300
                  ${role.color} ${role.hoverColor}
                  ${role.shadowColor} shadow-lg
                  ${hoveredCard === role.id ? 'transform -translate-y-2' : ''}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${role.color}
                `}
              >
                <div className="relative z-10 p-8">
                  <div className="flex flex-col items-center text-white">
                    <role.icon className="h-12 w-12 mb-4" />
                    <span className="text-lg font-medium mb-2">{role.title}</span>
                    <p className="text-sm text-white/80">{role.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Features Section */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <QrCode className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Quick Attendance</h3>
              <p className="text-gray-600">
                Mark attendance instantly by scanning QR codes. No more paper sheets or manual entry.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Real-time Tracking</h3>
              <p className="text-gray-600">
                Monitor attendance in real-time with detailed analytics and reports.
              </p>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-md">
              <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <ShieldCheck className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure & Reliable</h3>
              <p className="text-gray-600">
                Advanced security measures ensure attendance data integrity and privacy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}