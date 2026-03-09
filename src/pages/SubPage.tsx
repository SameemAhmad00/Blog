import React from 'react';
import { useLocation } from 'react-router';
import { motion } from 'motion/react';
import { Settings, User, Info, Bell, Shield, HelpCircle } from 'lucide-react';

const icons: Record<string, any> = {
  '/profile': { icon: User, color: 'text-blue-600', bg: 'bg-blue-50', title: 'User Profile' },
  '/settings': { icon: Settings, color: 'text-purple-600', bg: 'bg-purple-50', title: 'Settings' },
  '/about': { icon: Info, color: 'text-emerald-600', bg: 'bg-emerald-50', title: 'About App' },
  '/notifications': { icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50', title: 'Notifications' },
  '/security': { icon: Shield, color: 'text-rose-600', bg: 'bg-rose-50', title: 'Security' },
  '/help': { icon: HelpCircle, color: 'text-indigo-600', bg: 'bg-indigo-50', title: 'Help & Support' },
};

export const SubPage: React.FC = () => {
  const location = useLocation();
  const config = icons[location.pathname] || { icon: Info, color: 'text-gray-600', bg: 'bg-gray-50', title: 'Page' };
  const Icon = config.icon;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-6 p-8 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div className={`p-5 rounded-2xl ${config.bg} ${config.color}`}>
          <Icon className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{config.title}</h2>
          <p className="text-gray-500 mt-1">
            Path: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm font-mono">{location.pathname}</code>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="h-4 w-1/3 bg-gray-100 rounded mb-4" />
            <div className="h-3 w-full bg-gray-50 rounded mb-2" />
            <div className="h-3 w-2/3 bg-gray-50 rounded" />
          </motion.div>
        ))}
      </div>

      <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
        <p className="text-indigo-800 font-medium">
          Notice the back arrow in the header. Clicking it will take you back to the previous page or home.
        </p>
      </div>
    </div>
  );
};
