import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import BeekeeperDashboard from './pages/BeekeeperDashboard';
import LogHarvest from './pages/LogHarvest';
import HiveMonitoring from './pages/HiveMonitoring';
import AdminDashboard from './pages/AdminDashboard';
import SpectralScan from './pages/SpectralScan';
import KvicDashboard from './pages/KvicDashboard';
import VerifyBatch from './pages/VerifyBatch';
import OrderPage from './pages/OrderPage';
import ConsumerDashboard from './pages/ConsumerDashboard';
import ConsumerScan from './pages/ConsumerScan';
import ConsumerOrders from './pages/ConsumerOrders';

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
        <Routes>
          {/* Public routes with layout */}
          <Route path="/" element={<Layout><Landing /></Layout>} />
          <Route path="/login" element={<Layout><Login /></Layout>} />
          <Route path="/register" element={<Layout><Register /></Layout>} />

          {/* Beekeeper routes */}
          <Route path="/beekeeper" element={<Layout><ProtectedRoute roles={['beekeeper']}><BeekeeperDashboard /></ProtectedRoute></Layout>} />
          <Route path="/beekeeper/log" element={<Layout><ProtectedRoute roles={['beekeeper']}><LogHarvest /></ProtectedRoute></Layout>} />
          <Route path="/hive" element={<Layout><ProtectedRoute roles={['beekeeper']}><HiveMonitoring /></ProtectedRoute></Layout>} />

          {/* Admin routes */}
          <Route path="/admin" element={<Layout><ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute></Layout>} />
          <Route path="/admin/scan/:batchId" element={<Layout><ProtectedRoute roles={['admin']}><SpectralScan /></ProtectedRoute></Layout>} />

          {/* KVIC route */}
          <Route path="/kvic" element={<Layout><ProtectedRoute roles={['kvic']}><KvicDashboard /></ProtectedRoute></Layout>} />

          {/* Consumer routes */}
          <Route path="/consumer" element={<Layout><ProtectedRoute roles={['consumer']}><ConsumerDashboard /></ProtectedRoute></Layout>} />
          <Route path="/consumer/scan" element={<Layout><ProtectedRoute roles={['consumer']}><ConsumerScan /></ProtectedRoute></Layout>} />
          <Route path="/consumer/orders" element={<Layout><ProtectedRoute roles={['consumer']}><ConsumerOrders /></ProtectedRoute></Layout>} />

          {/* Public verification + order */}
          <Route path="/verify/:batchId" element={<VerifyBatch />} />
          <Route path="/order/:batchId" element={<Layout><OrderPage /></Layout>} />
        </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
