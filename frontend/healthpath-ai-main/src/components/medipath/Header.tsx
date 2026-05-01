import { Activity } from "lucide-react";
import { ProfileMenu } from "./ProfileMenu";

export const Header = ({ onLogoClick }: { onLogoClick?: () => void }) => {
  return (
    <header className="w-full border-b border-border/60 bg-card/85 backdrop-blur-md sticky top-0 z-30">
      <div className="container flex items-center justify-between py-3 gap-3">
        <button onClick={onLogoClick} className="flex items-center gap-2.5 group shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft group-hover:shadow-glow transition-shadow">
            <Activity className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="text-left">
            <h1 className="font-bold text-foreground leading-none">MediPath <span className="text-primary">AI</span></h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">Healthcare Navigator</p>
          </div>
        </button>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
            <span className="w-2 h-2 rounded-full bg-[hsl(var(--success))] animate-pulse" />
            AI online
          </div>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
};