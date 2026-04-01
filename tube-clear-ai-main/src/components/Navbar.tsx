import { useState } from "react";
import { Shield, Settings, Newspaper, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NavbarProps {
  activeSection: string;
  onNavigate: (section: string) => void;
}

const Navbar = ({ activeSection, onNavigate }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { id: "scan", label: "Home", icon: Shield },
    { id: "newsroom", label: "Policy News", icon: Newspaper },
    { id: "settings", label: "API Settings", icon: Settings },
  ];

  const handleNav = (id: string) => {
    onNavigate(id);
    setMobileOpen(false);
  };

  return (
    <nav className="glass-card sticky top-0 z-50 px-6 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <button onClick={() => handleNav("scan")} className="flex items-center gap-2 group">
          <Shield className="h-7 w-7 text-primary group-hover:drop-shadow-[0_0_8px_hsl(var(--neon-blue))] transition-all" />
          <span className="text-xl font-bold text-gradient">TubeClear</span>
        </button>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-1">
          {links.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeSection === id ? "neonOutline" : "ghost"}
              size="sm"
              onClick={() => handleNav(id)}
              className="gap-2"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>

        {/* Mobile toggle */}
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden mt-3 pb-2 flex flex-col gap-1 animate-fade-in">
          {links.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              variant={activeSection === id ? "neonOutline" : "ghost"}
              size="sm"
              onClick={() => handleNav(id)}
              className="gap-2 justify-start w-full"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Button>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
