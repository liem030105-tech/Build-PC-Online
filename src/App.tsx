import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import BuilderPage from '@/pages/BuilderPage';
import LoginPage from '@/pages/LoginPage';
import MyBuildsPage from '@/pages/MyBuildsPage';
import NotFoundPage from '@/pages/NotFoundPage';
import SharePage from '@/pages/SharePage';
import SignupPage from '@/pages/SignupPage';

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<BuilderPage />} />
            <Route path="builds" element={<MyBuildsPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
            <Route path="share" element={<SharePage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
      <Toaster position="top-center" richColors />
    </TooltipProvider>
  );
}
