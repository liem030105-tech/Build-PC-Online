import { BrowserRouter, Route, Routes } from 'react-router';
import { Layout } from '@/components/layout/Layout';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminPartsPage from '@/pages/AdminPartsPage';
import AdminVerifyPage from '@/pages/AdminVerifyPage';
import BuilderPage from '@/pages/BuilderPage';
import CommunityPage from '@/pages/CommunityPage';
import PostDetailPage from '@/pages/PostDetailPage';
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
            <Route path="posts" element={<CommunityPage />} />
            <Route path="posts/:id" element={<PostDetailPage />} />
            <Route path="builds" element={<MyBuildsPage />} />
            <Route path="admin" element={<AdminPartsPage />} />
            <Route path="admin/verify" element={<AdminVerifyPage />} />
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
