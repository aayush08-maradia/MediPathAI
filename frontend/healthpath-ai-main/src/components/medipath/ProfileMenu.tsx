import { useState } from "react";
import { LogOut, Copy, Check, IdCard, User as UserIcon, Mail, Calendar } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";

export const ProfileMenu = () => {
  const { user, logout } = useAuth();
  const [copied, setCopied] = useState(false);

  if (!user) return null;

  const copyId = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    await navigator.clipboard.writeText(user.id);
    setCopied(true);
    toast({ title: "MediPath ID copied", description: user.id });
    setTimeout(() => setCopied(false), 1500);
  };

  const initials = user.name
    .split(" ")
    .map((p) => p.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 p-1 pr-2 rounded-full bg-secondary border border-border hover:border-primary/40 hover:shadow-soft transition-all">
          <div className="w-8 h-8 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-semibold text-xs shadow-soft">
            {initials}
          </div>
          <div className="hidden sm:flex flex-col items-start leading-tight pr-1">
            <span className="text-xs font-semibold text-foreground max-w-[120px] truncate">{user.name}</span>
            <span className="text-[10px] font-mono text-primary">{user.id}</span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <div className="p-3 flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-semibold shadow-soft">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
          MediPath AI ID
        </DropdownMenuLabel>
        <button
          onClick={copyId}
          className="w-full flex items-center justify-between px-2 py-2 mx-1 rounded-md hover:bg-secondary transition-colors"
        >
          <span className="flex items-center gap-2 font-mono text-sm text-primary font-semibold">
            <IdCard className="w-4 h-4" /> {user.id}
          </span>
          {copied ? <Check className="w-4 h-4 text-[hsl(var(--success))]" /> : <Copy className="w-4 h-4 text-muted-foreground" />}
        </button>
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 space-y-1.5 text-xs text-muted-foreground">
          <p className="flex items-center gap-2"><UserIcon className="w-3.5 h-3.5" /> {user.name}</p>
          <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5" /> {user.email}</p>
          <p className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Member since {new Date(user.createdAt).toLocaleDateString()}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
          <LogOut className="w-4 h-4 mr-2" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};