import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { z } from "zod";
import { Activity, Mail, Lock, User, Phone, ShieldCheck, Sparkles, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { toast } from "@/hooks/use-toast";
import bgHospital from "@/assets/bg-hospital.jpg";

const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name is too short").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

type Mode = "login" | "signup";

const Login = () => {
  const { user, login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });

  if (user) return <Navigate to="/" replace />;

  const update = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "login") {
        const parsed = loginSchema.safeParse({ email: form.email, password: form.password });
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const u = await login(parsed.data.email, parsed.data.password);
        toast({ title: "Welcome back", description: `Logged in as ${u.name}` });
        navigate("/");
      } else {
        const parsed = signupSchema.safeParse(form);
        if (!parsed.success) throw new Error(parsed.error.issues[0].message);
        const u = await signup({
          name: parsed.data.name,
          email: parsed.data.email,
          phone: parsed.data.phone || undefined,
          password: parsed.data.password,
        });
        toast({
          title: "Account created",
          description: `Your MediPath ID: ${u.id}`,
        });
        navigate("/");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left — brand panel with real hospital image */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 text-white overflow-hidden">
        <img
          src={bgHospital}
          alt="Modern hospital corridor with doctors"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[hsl(199_89%_22%/0.92)] via-[hsl(199_89%_30%/0.85)] to-[hsl(187_85%_30%/0.75)]" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center">
            <Activity className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-none">MediPath <span className="text-[hsl(187_85%_75%)]">AI</span></h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-white/70 mt-1">Healthcare Navigator · India</p>
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5" />
            Trusted by patients across India
          </div>
          <h2 className="text-4xl font-bold leading-tight">
            Right care.<br />Right hospital.<br />
            <span className="text-[hsl(187_85%_80%)]">Right cost.</span>
          </h2>
          <p className="text-white/85 text-base leading-relaxed">
            Your personal MediPath AI ID securely connects every search, estimate, and hospital match — so you always have your healthcare journey at your fingertips.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { k: "1,200+", v: "NABH hospitals" },
              { k: "₹ Transparent", v: "Cost estimates" },
              { k: "Hindi · English", v: "Natural language" },
              { k: "ICD-10", v: "Medically mapped" },
            ].map((s) => (
              <div key={s.v} className="rounded-xl bg-white/10 backdrop-blur-md border border-white/15 p-3">
                <div className="font-bold text-lg">{s.k}</div>
                <div className="text-xs text-white/75">{s.v}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-xs text-white/70">
          <ShieldCheck className="w-4 h-4" />
          End-to-end private · Your data stays on your device in this demo
        </div>
      </div>

      {/* Right — form */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-gradient-soft">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-soft">
              <Activity className="w-5 h-5 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <h1 className="font-bold text-foreground">MediPath <span className="text-primary">AI</span></h1>
          </div>

          <div className="inline-flex p-1 rounded-full bg-secondary border border-border mb-6">
            {(["login", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); }}
                className={`px-5 py-1.5 text-sm font-medium rounded-full transition-all ${
                  mode === m ? "bg-card text-primary shadow-soft" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "login" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <h2 className="text-3xl font-bold text-foreground tracking-tight">
            {mode === "login" ? "Welcome back" : "Create your MediPath ID"}
          </h2>
          <p className="text-muted-foreground mt-2">
            {mode === "login"
              ? "Sign in to access your saved searches and cost estimates."
              : "Get your unique MediPath AI ID and start navigating Indian healthcare."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <AnimatePresence mode="wait">
              {mode === "signup" && (
                <motion.div
                  key="signup-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <Field icon={User} label="Full name" id="name" placeholder="Aarav Sharma"
                    value={form.name} onChange={(v) => update("name", v)} />
                  <Field icon={Phone} label="Phone (optional)" id="phone" placeholder="+91 98xxxxxxxx"
                    value={form.phone} onChange={(v) => update("phone", v)} />
                </motion.div>
              )}
            </AnimatePresence>

            <Field icon={Mail} label="Email" id="email" type="email" placeholder="you@example.com"
              value={form.email} onChange={(v) => update("email", v)} />
            <Field icon={Lock} label="Password" id="password" type="password" placeholder="Minimum 6 characters"
              value={form.password} onChange={(v) => update("password", v)} />

            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <Button type="submit" disabled={submitting} className="w-full h-11 bg-gradient-primary hover:opacity-95 shadow-medium text-base font-semibold">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Sign in securely" : "Create my MediPath ID"}
            </Button>

            <p className="text-xs text-center text-muted-foreground pt-2">
              By continuing you agree to MediPath AI's terms and confirm this is a hackathon demo — not medical advice.
            </p>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

const Field = ({
  icon: Icon, label, id, value, onChange, type = "text", placeholder,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; id: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) => (
  <div className="space-y-1.5">
    <Label htmlFor={id} className="text-foreground/80">{label}</Label>
    <div className="relative">
      <Icon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 h-11 bg-card"
      />
    </div>
  </div>
);

export default Login;