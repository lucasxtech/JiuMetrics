import { ReactNode, useState } from "react";
import { NavLink as RouterNavLink } from "react-router-dom";
import { LayoutDashboard, Upload, User, Users, Menu, X, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

interface MainLayoutProps {
  children: ReactNode;
}

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ElementType;
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Análise de Vídeo", href: "/video-analysis", icon: Upload },
  { name: "Atletas", href: "/athletes", icon: User },
  { name: "Adversários", href: "/opponents", icon: Users },
];

export default function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen flex w-full bg-gray-50">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-gray-200">
        <div className="flex flex-col flex-1 min-h-0">
          <div className="flex items-center h-16 flex-shrink-0 px-6 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                <span className="text-sm font-bold text-white">JM</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">JiuMetrics</h1>
            </div>
          </div>
          <nav className="flex-1 px-3 py-6 space-y-1">
            {navigation.map((item) => (
              <RouterNavLink
                key={item.name}
                to={item.href}
                end={item.href === "/"}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                    {item.name}
                  </>
                )}
              </RouterNavLink>
            ))}
          </nav>
          <div className="flex-shrink-0 px-3 pb-4">
            <Button
              variant="ghost"
              onClick={handleLogout}
              className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            >
              <LogOut className="mr-3 h-5 w-5 text-gray-500" />
              Sair
            </Button>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 lg:hidden"
            >
              <div className="flex flex-col flex-1 min-h-0 h-full">
                <div className="flex items-center justify-between h-16 flex-shrink-0 px-6 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                      <span className="text-sm font-bold text-white">JM</span>
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">JiuMetrics</h1>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSidebarOpen(false)}
                    className="text-gray-700"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <nav className="flex-1 px-3 py-6 space-y-1">
                  {navigation.map((item) => (
                    <RouterNavLink
                      key={item.name}
                      to={item.href}
                      end={item.href === "/"}
                      className={({ isActive }) =>
                        `flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 ${
                          isActive
                            ? "bg-blue-50 text-blue-600"
                            : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                        }`
                      }
                      onClick={() => setSidebarOpen(false)}
                    >
                      {({ isActive }) => (
                        <>
                          <item.icon className={`mr-3 h-5 w-5 ${isActive ? "text-blue-600" : "text-gray-500"}`} />
                          {item.name}
                        </>
                      )}
                    </RouterNavLink>
                  ))}
                </nav>
                <div className="flex-shrink-0 px-3 pb-4">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <LogOut className="mr-3 h-5 w-5 text-gray-500" />
                    Sair
                  </Button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex flex-col flex-1 lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-white px-6 backdrop-blur-lg bg-white/95">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <Avatar className="h-9 w-9 ring-2 ring-gray-200">
              <AvatarImage src="https://api.dicebear.com/7.x/avataaars/svg?seed=athlete" />
              <AvatarFallback>AT</AvatarFallback>
            </Avatar>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 lg:p-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
