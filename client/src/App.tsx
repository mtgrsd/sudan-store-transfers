import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAgents from "./pages/admin/Agents";
import AdminTransfers from "./pages/admin/Transfers";
import AdminAuditLog from "./pages/admin/AuditLog";
import AdminAgentStatement from "./pages/admin/AgentStatement";
import AgentDashboard from "./pages/agent/Dashboard";
import AgentTransfers from "./pages/agent/Transfers";
import AgentProfile from "./pages/agent/Profile";
import VerifyTransfer from "./pages/VerifyTransfer";
import AdminSystemSettings from "./pages/admin/SystemSettings";

function Router() {
  const { user, loading } = useAuth();
  const [location, navigate] = useLocation();

  // Redirect unauthenticated users to /login
  useEffect(() => {
    if (loading) return;
    if (!user) {
      const publicPaths = ["/login", "/verify"];
      const isPublic = publicPaths.some(p => location === p || location.startsWith(p + "/"));
      if (!isPublic) {
        navigate("/login");
      }
    }
  }, [loading, user, location, navigate]);

  // Redirect authenticated users away from /login
  useEffect(() => {
    if (loading || !user) return;
    if (location === "/login") {
      const role = user.role;
      if (role === "super_admin" || role === "admin" || role === "employee") {
        navigate("/admin");
      } else if (role === "agent") {
        navigate("/agent");
      }
    }
  }, [loading, user, location, navigate]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-slate-600 border-t-amber-500"></div>
          <p className="text-slate-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  // Public routes - always accessible
  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/verify/:notificationNumber" component={VerifyTransfer} />
        <Route path="/verify" component={VerifyTransfer} />
        <Route component={Login} />
      </Switch>
    );
  }

  // super_admin و admin → لوحة الإدارة
  if (user.role === "super_admin" || user.role === "admin") {
    return (
      <Switch>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/agents" component={AdminAgents} />
        <Route path="/admin/transfers" component={AdminTransfers} />
        <Route path="/admin/audit-log" component={AdminAuditLog} />
        <Route path="/admin/agents/:agentId" component={AdminAgentStatement} />
        <Route path="/admin/settings" component={AdminSystemSettings} />
        <Route path="/verify/:notificationNumber" component={VerifyTransfer} />
        <Route path="/verify" component={VerifyTransfer} />
        <Route path="/404" component={NotFound} />
        <Route component={AdminDashboard} />
      </Switch>
    );
  }

  // employee → واجهة الوكيل
  if (user.role === "employee") {
    return (
      <Switch>
        <Route path="/agent" component={AgentDashboard} />
        <Route path="/agent/transfers" component={AgentTransfers} />
        <Route path="/agent/profile" component={AgentProfile} />
        <Route path="/verify/:notificationNumber" component={VerifyTransfer} />
        <Route path="/verify" component={VerifyTransfer} />
        <Route component={AgentDashboard} />
      </Switch>
    );
  }

  // agent → واجهة الوكيل
  if (user.role === "agent") {
    return (
      <Switch>
        <Route path="/agent" component={AgentDashboard} />
        <Route path="/agent/transfers" component={AgentTransfers} />
        <Route path="/agent/profile" component={AgentProfile} />
        <Route path="/verify/:notificationNumber" component={VerifyTransfer} />
        <Route path="/verify" component={VerifyTransfer} />
        <Route path="/404" component={NotFound} />
        <Route component={AgentDashboard} />
      </Switch>
    );
  }

  return <Route component={NotFound} />;
}

function App() {
  useEffect(() => {
    // Set RTL direction for Arabic
    document.documentElement.dir = "rtl";
    document.documentElement.lang = "ar";
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
