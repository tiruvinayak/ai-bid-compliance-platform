import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { Login } from './pages/Login';
import { BidderSignup } from './pages/BidderSignup';
import { Dashboard } from './pages/Dashboard';
import { CentralGovernmentDashboard } from './pages/CentralGovernmentDashboard';
import { SectorPage } from './pages/SectorPage';
import { DepartmentPage } from './pages/DepartmentPage';
import { UserDashboard } from './pages/UserDashboard';
import { UserUpload } from './pages/UserUpload';
import { UserUploads } from './pages/UserUploads';
import { GovernmentInstructions } from './pages/GovernmentInstructions';
import { Helpdesk } from './pages/Helpdesk';
import { AccountPage } from './pages/AccountPage';

import { CreateBid } from './pages/CreateBid';
import { TenderUpload } from './pages/TenderUpload';
import { DocumentUpload } from './pages/DocumentUpload';
import { AnalysisProgress } from './pages/AnalysisProgress';
import { ComplianceDashboard } from './pages/ComplianceDashboard';
import { RequirementDetails } from './pages/RequirementDetails';
import { EvidenceViewer } from './pages/EvidenceViewer';
import { RiskDashboard } from './pages/RiskDashboard';
import { ConflictDashboard } from './pages/ConflictDashboard';
import { ReviewPage } from './pages/ReviewPage';
import { ReportPage } from './pages/ReportPage';
import { AuditPage } from './pages/AuditPage';
import { homePathForRole, isBidderRole, isGovernmentRole } from './utils/roles';
import type { UserRole } from './types';

type GovAllowedRole = 'GOVERNMENT OFFICER' | 'CENTRAL_ADMIN' | 'SECTOR_USER';

const ProtectedRoute: React.FC<{
  allowedRole?: 'USER' | GovAllowedRole | GovAllowedRole[];
  children: React.ReactNode;
}> = ({ allowedRole, children }) => {
  const location = useLocation();
  const [, setAuthVersion] = React.useState(0);

  React.useEffect(() => {
    const handleAuthCleared = () => setAuthVersion((version) => version + 1);
    window.addEventListener('gem-auth-cleared', handleAuthCleared);
    return () => window.removeEventListener('gem-auth-cleared', handleAuthCleared);
  }, []);

  const token = localStorage.getItem('gem_auth_token');
  const role = localStorage.getItem('gem_user_role') as UserRole | null;

  if (!token || (!isBidderRole(role) && !isGovernmentRole(role))) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole) {
    const allowed = (Array.isArray(allowedRole) ? allowedRole : [allowedRole]) as string[];
    if (!role || !allowed.includes(role)) {
      return <Navigate to={homePathForRole(role)} replace />;
    }
  }

  return <React.Fragment key={location.pathname}>{children}</React.Fragment>;
};

const GovernmentRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <ProtectedRoute allowedRole={['GOVERNMENT OFFICER', 'CENTRAL_ADMIN', 'SECTOR_USER']}>
    {children}
  </ProtectedRoute>
);

const DefaultRedirect: React.FC = () => {
  const token = localStorage.getItem('gem_auth_token');
  const role = localStorage.getItem('gem_user_role') as UserRole | null;

  if (!token || (!isBidderRole(role) && !isGovernmentRole(role))) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={homePathForRole(role)} replace />;
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup/bidder" element={<BidderSignup />} />
        </Route>

        <Route element={<MainLayout />}>
          <Route
            path="/user/dashboard"
            element={
              <ProtectedRoute allowedRole="USER">
                <UserDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/upload"
            element={
              <ProtectedRoute allowedRole="USER">
                <UserUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/user/uploads"
            element={
              <ProtectedRoute allowedRole="USER">
                <UserUploads />
              </ProtectedRoute>
            }
          />

          <Route
            path="/government"
            element={
              <GovernmentRoute>
                <CentralGovernmentDashboard />
              </GovernmentRoute>
            }
          />
          <Route
            path="/government/sectors/:sectorId"
            element={
              <GovernmentRoute>
                <SectorPage />
              </GovernmentRoute>
            }
          />
          <Route
            path="/government/departments/:departmentId"
            element={
              <GovernmentRoute>
                <DepartmentPage />
              </GovernmentRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <GovernmentRoute>
                <Dashboard />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/create"
            element={
              <GovernmentRoute>
                <CreateBid />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/upload-tender"
            element={
              <GovernmentRoute>
                <TenderUpload />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/upload-documents"
            element={
              <GovernmentRoute>
                <DocumentUpload />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/analysis"
            element={
              <GovernmentRoute>
                <AnalysisProgress />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/compliance"
            element={
              <GovernmentRoute>
                <ComplianceDashboard />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/requirements/:reqId"
            element={
              <GovernmentRoute>
                <RequirementDetails />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/evidence/:reqId"
            element={
              <GovernmentRoute>
                <EvidenceViewer />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/risks"
            element={
              <GovernmentRoute>
                <RiskDashboard />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/conflicts"
            element={
              <GovernmentRoute>
                <ConflictDashboard />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/review"
            element={
              <GovernmentRoute>
                <ReviewPage />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/report"
            element={
              <GovernmentRoute>
                <ReportPage />
              </GovernmentRoute>
            }
          />
          <Route
            path="/bids/:id/audit"
            element={
              <GovernmentRoute>
                <AuditPage />
              </GovernmentRoute>
            }
          />

          <Route
            path="/government-instructions"
            element={
              <GovernmentRoute>
                <GovernmentInstructions />
              </GovernmentRoute>
            }
          />
          <Route
            path="/helpdesk"
            element={
              <ProtectedRoute>
                <Helpdesk />
              </ProtectedRoute>
            }
          />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
