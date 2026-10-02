import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { AppLayout, RequireRole } from '../layouts/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { ForgotPasswordPage, LoginPage, NotFoundPage, RegisterPage, UnauthorizedPage } from '../pages/AuthPages';
import { DashboardPage } from '../pages/DashboardPage';
import { AccountDetailsPage, AccountsPage } from '../pages/AccountsPages';
import { TransactionsPage } from '../pages/TransactionsPage';
import { TransfersPage } from '../pages/TransfersPage';
import { PaymentsPage } from '../pages/PaymentsPage';
import { LoansPage } from '../pages/LoansPage';
import { CardsPage } from '../pages/CardsPage';
import { BeneficiariesPage } from '../pages/BeneficiariesPage';
import { NotificationsPage, SupportPage } from '../pages/ServicePages';
import { ApiDocsPage } from '../pages/ApiDocsPage';
import { ChallengeDetailPage, ChallengesListPage } from '../pages/ChallengesPages';
import { AdminCustomersPage, AdminDashboardPage, AdminLoansPage, AdminTicketsPage, AdminTransactionsPage } from '../pages/admin/AdminPages';
import { LabHomePage } from '../pages/lab/LabHomePage';
import { FormsLabPage, LocatorsLabPage, PaginationLabPage, TablesLabPage } from '../pages/lab/LabBasics';
import { DialogsLabPage, IframesLabPage, PopupsLabPage, TabsLabPage, WorkflowsLabPage } from '../pages/lab/LabBrowser';
import { ApiLabPage, DownloadLabPage, NetworkLabPage, UploadLabPage } from '../pages/lab/LabApi';

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'ADMIN' ? '/admin' : '/dashboard'} replace />;
}

const customer = (el: React.ReactNode) => <RequireRole role="CUSTOMER">{el}</RequireRole>;
const admin = (el: React.ReactNode) => <RequireRole role="ADMIN">{el}</RequireRole>;

const routes: RouteObject[] = [
  { path: '/', element: <HomeRedirect /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  {
    element: <AppLayout />,
    children: [
      { path: '/dashboard', element: customer(<DashboardPage />) },
      { path: '/accounts', element: customer(<AccountsPage />) },
      { path: '/accounts/:id', element: customer(<AccountDetailsPage />) },
      { path: '/transactions', element: customer(<TransactionsPage />) },
      { path: '/transfers', element: customer(<TransfersPage />) },
      { path: '/payments', element: customer(<PaymentsPage />) },
      { path: '/loans', element: customer(<LoansPage />) },
      { path: '/cards', element: customer(<CardsPage />) },
      { path: '/beneficiaries', element: customer(<BeneficiariesPage />) },
      { path: '/notifications', element: customer(<NotificationsPage />) },
      { path: '/support', element: customer(<SupportPage />) },

      { path: '/admin', element: admin(<AdminDashboardPage />) },
      { path: '/admin/customers', element: admin(<AdminCustomersPage />) },
      { path: '/admin/transactions', element: admin(<AdminTransactionsPage />) },
      { path: '/admin/loans', element: admin(<AdminLoansPage />) },
      { path: '/admin/tickets', element: admin(<AdminTicketsPage />) },

      { path: '/lab', element: <LabHomePage /> },
      { path: '/lab/locators', element: <LocatorsLabPage /> },
      { path: '/lab/forms', element: <FormsLabPage /> },
      { path: '/lab/tables', element: <TablesLabPage /> },
      { path: '/lab/pagination', element: customer(<PaginationLabPage />) },
      { path: '/lab/iframes', element: <IframesLabPage /> },
      { path: '/lab/dialogs', element: <DialogsLabPage /> },
      { path: '/lab/popups', element: <PopupsLabPage /> },
      { path: '/lab/tabs', element: <TabsLabPage /> },
      { path: '/lab/api', element: <ApiLabPage /> },
      { path: '/lab/network', element: <NetworkLabPage /> },
      { path: '/lab/upload', element: customer(<UploadLabPage />) },
      { path: '/lab/download', element: customer(<DownloadLabPage />) },
      { path: '/lab/workflows', element: customer(<WorkflowsLabPage />) },

      { path: '/challenges', element: <Navigate to="/challenges/beginner" replace /> },
      { path: '/challenges/c/:id', element: <ChallengeDetailPage /> },
      { path: '/challenges/:level', element: <ChallengesListPage /> },
      { path: '/api-docs', element: <ApiDocsPage /> },
      { path: '/unauthorized', element: <UnauthorizedPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];

export const router = createBrowserRouter(routes);
