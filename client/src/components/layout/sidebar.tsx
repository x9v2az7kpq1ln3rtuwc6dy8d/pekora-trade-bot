import { Link, useLocation } from "wouter";
import { Bot, ChartLine, Package, History, Settings, Download, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    { name: "Trade Evaluation", href: "/", icon: ChartLine },
    { name: "Item Management", href: "/items", icon: Package },
    { name: "Trade History", href: "/history", icon: History },
    { name: "Bias Settings", href: "/bias", icon: Settings },
  ];

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Bot className="text-primary-foreground text-sm" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">Trade Bot</h1>
            <p className="text-xs text-muted-foreground">Web Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <li key={item.name}>
                <Link href={item.href}>
                  <span 
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 rounded-md font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                    )}
                    data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <button 
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors w-full text-left"
              data-testid="button-export-data"
              onClick={() => window.open('/api/export/items', '_blank')}
            >
              <Download className="w-4 h-4" />
              <span>Export Data</span>
            </button>
          </li>
        </ul>
      </nav>
      
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
            <User className="text-accent-foreground text-sm" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">Admin User</p>
            <p className="text-xs text-muted-foreground">Trade Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
