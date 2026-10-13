import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { Layout, Protected } from './components';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VoucherList from './pages/VoucherList';
import VoucherForm from './pages/VoucherForm';
import VoucherDetails from './pages/VoucherDetails';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Protected />}>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="vouchers" element={<VoucherList key="all" />} />
              <Route element={<Protected roles={['EMPLOYEE']} />}>
                <Route path="vouchers/new" element={<VoucherForm />} />
                <Route path="vouchers/:id/edit" element={<VoucherForm />} />
              </Route>
              <Route element={<Protected roles={['DIRECTOR']} />}>
                <Route path="pending" element={<VoucherList key="pending" title="Pending Approvals" status="PENDING" />} />
              </Route>
              <Route path="vouchers/:id" element={<VoucherDetails />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
