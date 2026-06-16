import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

const LOGO_URL = "/manus-storage/sudan-store-logo_c9d76f93.png";

interface NavItem {
  label: string;
  href: string;
}

interface SudanStoreHeaderProps {
  navItems?: NavItem[];
  currentPath?: string;
  title?: string;
  showLogout?: boolean;
}

export default function SudanStoreHeader({
  navItems = [],
  currentPath = "",
  title,
  showLogout = true,
}: SudanStoreHeaderProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  return (
    <div className="sticky top-0 z-50">
      {/* Top Header */}
      <header
        style={{
          background: "linear-gradient(135deg, #1a2e6b 0%, #0f1d4a 100%)",
          boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
        }}
      >
        <div className="container flex items-center justify-between py-3">
          {/* Logo + Brand */}
          <div
            className="flex items-center gap-3 cursor-pointer"
            onClick={() =>
              setLocation(user?.role === "admin" ? "/admin" : "/agent")
            }
          >
            <img
              src={LOGO_URL}
              alt="متجر السودان"
              style={{
                height: "44px",
                width: "auto",
                objectFit: "contain",
                filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "800",
                  color: "white",
                  lineHeight: 1.1,
                  fontFamily: "'Cairo', sans-serif",
                }}
              >
                متجر السودان
              </div>
              <div
                style={{
                  fontSize: "0.65rem",
                  color: "rgba(255,255,255,0.7)",
                  fontFamily: "'Cairo', sans-serif",
                  letterSpacing: "0.05em",
                }}
              >
                Sudan Store · نظام التحويلات
              </div>
            </div>
          </div>

          {/* User Info + Logout */}
          {showLogout && user && (
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: "600",
                    color: "white",
                  }}
                >
                  {user.name}
                </div>
                <div
                  style={{
                    fontSize: "0.7rem",
                    color: "rgba(255,255,255,0.65)",
                  }}
                >
                  {user.role === "admin" ? "مدير النظام" : "وكيل"}
                </div>
              </div>
              <button
                onClick={() => logout()}
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: "0.5rem",
                  color: "white",
                  padding: "0.4rem 0.9rem",
                  fontSize: "0.8rem",
                  fontFamily: "'Cairo', sans-serif",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.25)";
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.background =
                    "rgba(255,255,255,0.15)";
                }}
              >
                خروج
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Navigation Bar */}
      {navItems.length > 0 && (
        <nav
          style={{
            backgroundColor: "white",
            borderBottom: "2px solid #e5e7eb",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          }}
        >
          <div className="container flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = currentPath === item.href;
              return (
                <button
                  key={item.href}
                  onClick={() => setLocation(item.href)}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.75rem 1rem",
                    fontSize: "0.875rem",
                    fontWeight: isActive ? "700" : "500",
                    color: isActive ? "#1a2e6b" : "#6b7280",
                    borderBottom: isActive
                      ? "3px solid #1a2e6b"
                      : "3px solid transparent",
                    whiteSpace: "nowrap",
                    textDecoration: "none",
                    transition: "all 0.2s",
                    fontFamily: "'Cairo', sans-serif",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.color = "#1a2e6b";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      (e.currentTarget as HTMLButtonElement).style.color = "#6b7280";
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
