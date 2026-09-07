import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Register from "./pages/Register";
import CustomerRegister from "./pages/CustomerRegister";
import ProviderRegister from "./pages/ProviderRegister";
import CustomerDashboard from "./pages/CustomerDashboard";
import ProviderDashboard from "./pages/ProviderDashboard";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        <Routes>

          {/* Default */}
          <Route
            path="/"
            element={<Navigate to="/login" replace />}
          />

          {/* Login */}
          <Route
            path="/login"
            element={<Login />}
          />

          {/* Password Recovery Routes (Requirement 9) */}
          <Route
            path="/forgot-password"
            element={<ForgotPassword />}
          />
          <Route
            path="/reset-password"
            element={<ResetPassword />}
          />

          {/* Choose Customer / Provider */}
          <Route
            path="/register"
            element={<Register />}
          />

          {/* Customer Registration */}
          <Route
            path="/register/customer"
            element={<CustomerRegister />}
          />
          <Route
            path="/customer"
            element={<Navigate to="/register/customer" replace />}
          />

          {/* Provider Registration */}
          <Route
            path="/register/provider"
            element={<ProviderRegister />}
          />
          <Route
            path="/provider"
            element={<Navigate to="/register/provider" replace />}
          />

          {/* Protected Customer Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute allowedRole="CUSTOMER">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/customer-dashboard"
            element={
              <ProtectedRoute allowedRole="CUSTOMER">
                <CustomerDashboard />
              </ProtectedRoute>
            }
          />

          {/* Protected Provider Dashboard */}
          <Route
            path="/provider-dashboard"
            element={
              <ProtectedRoute allowedRole="PROVIDER">
                <ProviderDashboard />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route
            path="*"
            element={<Navigate to="/login" replace />}
          />

        </Routes>

      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;