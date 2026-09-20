import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { AuthLayout } from './layouts/AuthLayout';
import { Login } from './pages/Login';
import { BidderSignup } from './pages/BidderSignup';
import { Dashboard } from './pages/Dashboard';
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


// Role Guard Component
const ProtectedRoute: React.FC<{ allowedRole?: 'USER' | 'GOVERNMENT OFFICER'; children: React.ReactNode }> = ({ allowedRole, children }) => {
  const location = useLocation();
  const [, setAuthVersion] = React.useState(0);

  React.useEffect(() => {
    const handleAuthCleared = () => setAuthVersion((version) => version + 1);
    window.addEventListener('gem-auth-cleared', handleAuthCleared);
    return () => window.removeEventListener('gem-auth-cleared', handleAuthCleared);
  }, []);

  const token = localStorage.getItem('gem_auth_token');
  const role = localStorage.getItem('gem_user_role');

  if (!token || (role !== 'USER' && role !== 'GOVERNMENT OFFICER')) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRole && role !== allowedRole) {
    if (role === 'USER') {
      return <Navigate to="/user/dashboard" replace />;
    } else {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <React.Fragment key={location.pathname}>{children}</React.Fragment>;
};

// Root Redirect Guard
const DefaultRedirect: React.FC = () => {
  const token = localStorage.getItem('gem_auth_token');
  const role = localStorage.getItem('gem_user_role');

  if (!token || (role !== 'USER' && role !== 'GOVERNMENT OFFICER')) {
    return <Navigate to="/login" replace />;
  }
  if (role === 'USER') {
    return <Navigate to="/user/dashboard" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth Layout */}
        <Route element={<AuthLayout />}>
<Route path="/login" element={<Login />} />
        <Route path="/signup/bidder" element={<BidderSignup />} />
        </Route>

        {/* Main Application Layout */}
        <Route element={<MainLayout />}>
          {/* USER / BIDDER ROUTES */}
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

          {/* GOVERNMENT OFFICER ROUTES */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/create"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <CreateBid />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/upload-tender"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <TenderUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/upload-documents"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <DocumentUpload />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/analysis"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <AnalysisProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/compliance"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <ComplianceDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/requirements/:reqId"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <RequirementDetails />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/evidence/:reqId"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <EvidenceViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/risks"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <RiskDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/conflicts"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <ConflictDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/review"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <ReviewPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/report"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <ReportPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bids/:id/audit"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <AuditPage />
              </ProtectedRoute>
            }
          />

          {/* COMMON SHARED INSTITUTIONAL ROUTES */}
          <Route
            path="/government-instructions"
            element={
              <ProtectedRoute allowedRole="GOVERNMENT OFFICER">
                <GovernmentInstructions />
              </ProtectedRoute>
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

        {/* Fallback Catch-All Route */}
        <Route path="*" element={<DefaultRedirect />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
