import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Landing from '@/pages/Landing';
import Auth from '@/pages/Auth';
import Home from '@/pages/Home';
import Course from '@/pages/Course';
import Lesson from '@/pages/Lesson';
import Admin from '@/pages/Admin';
import AIToolbox from '@/pages/AIToolbox';
import Agenda from '@/pages/Agenda';
import NotFound from '@/pages/NotFound';
import Register from '@/pages/Register';
import Referral from '@/pages/Referral';
import ReferralApply from '@/pages/ReferralApply';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import FloatingAIRobot from '@/components/ui/FloatingAIRobot';
import { InstallBanner } from '@/components/ui/InstallBanner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/auth" />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAdmin) return <Navigate to="/" />;
  return <>{children}</>;
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'hsl(220 13% 8%)' }}>
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">Carregando...</span>
      </div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen" style={{ background: 'hsl(220 13% 8%)' }}>
      <Routes>
        <Route path="/" element={user ? <ProtectedRoute><Home /></ProtectedRoute> : <Landing />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/register/:token" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/courses/:courseId" element={<ProtectedRoute><Course /></ProtectedRoute>} />
        <Route path="/courses/:courseId/lesson/:lessonId" element={<ProtectedRoute><Lesson /></ProtectedRoute>} />
        <Route path="/indicacao/:code" element={<ReferralApply />} />
        <Route path="/indicar" element={<ProtectedRoute><Referral /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
        <Route path="/ai-tools" element={<AIToolbox />} />
        <Route path="/admin/*" element={<AdminRoute><Admin /></AdminRoute>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <FloatingAIRobot />
      <InstallBanner />
    </div>
  );
}
