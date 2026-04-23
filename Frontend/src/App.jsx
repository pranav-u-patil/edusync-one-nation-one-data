import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { UploadCsvPage } from './pages/UploadCsvPage';
import { MappingPage } from './pages/MappingPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { AutofillPage } from './pages/AutofillPage';
import { ReportOutputPage } from './pages/ReportOutputPage';
import { ReportsPage } from './pages/ReportsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { TemplateManagementPage } from './pages/TemplateManagementPage';
import { FieldBuilderPage } from './pages/FieldBuilderPage';
import { MappingConfigPage } from './pages/MappingConfigPage';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to={user.role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace /> : <LoginPage />}
      />
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to={user?.role === 'admin' ? '/admin-dashboard' : '/dashboard'} replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/upload" element={<UploadCsvPage />} />
        <Route path="/map-fields" element={<MappingPage />} />
        <Route path="/templates" element={<TemplatesPage />} />
        <Route path="/autofill" element={<AutofillPage />} />
        <Route path="/report-output" element={<ReportOutputPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/admin-dashboard" element={<AdminDashboardPage />} />
        <Route path="/admin/templates" element={<TemplateManagementPage />} />
        <Route path="/admin/fields" element={<FieldBuilderPage />} />
        <Route path="/admin/mappings" element={<MappingConfigPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <AppRoutes />
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
