import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Redirect, Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect } from "react";
import Home from "./pages/Home";
import Login from "./pages/Login";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminAgents from "./pages/admin/Agents";
import AdminCustomers from "./pages/admin/Customers";
import AdminTransfers from "./pages/admin/Transfers";
import AdminAuditLog from "./pages/admin/AuditLog";
import AgentDashboard from "./pages/agent/Dashboard";
import AgentTransfers from "./pages/agent/Transfers";
import AgentProfile from "./pages/agent/Profile";
import VerifyTransfer from "./pages/VerifyTransfer";

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/login" component={Login} />
        <Route path="/verify/:notificationNumber" component={VerifyTransfer} />
        <Route path="/verify" component={VerifyTransfer} />
        <Route><Redirect to="/" /></Route>
      </Switch>
    );
  }

  if (user.role === "admin") {
    return (
      <Switch>
        <Route path="/"><Redirect to="/admin" /></Route>
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/admin/agents" component={AdminAgents} />
        <Route path="/admin/customers" component={AdminCustomers} />
        <Route path="/admin/transfers" component={AdminTransfers} />
        <Route path="/admin/audit-log" component={AdminAuditLog} />
        <Route path="/verify/:notificationNumber" component={VerifyTransfer} />
        <Route path="/verify" component={VerifyTransfer} />
        <Route path="/404" component={NotFound} />
        <Route><Redirect to="/admin" /></Route>
      </Switch>
    );
  }

  if (user.role === "agent") {
    return (
      <Switch>
        <Route path="/"><Redirect to="/agent" /></Route>
        <Route path="/agent" component={AgentDashboard} />
        <Route path="/agent/transfers" component={AgentTransfers} />
        <Route path="/agent/profile" component={AgentProfile} />
        <Route path="/verify/:notificationNumber" component={VerifyTransfer} />
        <Route path="/verify" component={VerifyTransfer} />
        <Route path="/404" component={NotFound} />
        <Route><Redirect to="/agent" /></Route>
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
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
