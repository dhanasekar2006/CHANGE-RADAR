import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  TrendingUp,
  User,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";

import "@/components/LampLogin.css";

type Mode = "signin" | "signup";

interface LampLoginProps {
  /** Throw an Error with a message to show it under the button. */
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (name: string, email: string, password: string) => Promise<void>;
}

const ICON = { size: 18, strokeWidth: 2, "aria-hidden": true } as const;

/** The lamp sign-in screen. Presentational: the page decides what signing in actually does. */
export function LampLogin({ onSignIn, onSignUp }: LampLoginProps) {
  const [lampOn, setLampOn] = useState(true);
  const [pulled, setPulled] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [mode, setMode] = useState<Mode>("signin");
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);

  // Random positions are created once, so they don't jump on every re-render.
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 55}%`,
        opacity: 0.15 + Math.random() * 0.4,
      })),
    [],
  );
  const fireflies = useMemo(
    () =>
      Array.from(
        { length: 18 },
        () =>
          ({
            left: `${10 + Math.random() * 45}%`,
            top: `${30 + Math.random() * 60}%`,
            "--d": `${(7 + Math.random() * 8).toFixed(1)}s`,
            "--delay": `${(-Math.random() * 10).toFixed(1)}s`,
            "--dx": `${Math.round(Math.random() * 80 - 40)}px`,
            "--dy": `${Math.round(-20 - Math.random() * 60)}px`,
          }) as CSSProperties,
      ),
    [],
  );

  const click = (on: boolean) => {
    if (!soundOn) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      audioRef.current ??= new Ctx();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = on ? 1400 : 900;
      gain.gain.setValueAtTime(0.06, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.06);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.07);
    } catch {
      // Audio is optional.
    }
  };

  const pullChain = () => {
    setPulled(true);
    setTimeout(() => setPulled(false), 220);
    const next = !lampOn;
    setLampOn(next);
    click(next);
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setStatus("");
  };

  const isSignUp = mode === "signup";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (isSignUp && !name.trim()) return setStatus("Please enter your name.");
    if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      return setStatus("Please enter a valid email address.");
    // Only new passwords are length-checked; existing accounts sign in with whatever they have.
    if (isSignUp && password.length < 8)
      return setStatus("Password must be at least 8 characters.");
    if (!password) return setStatus("Please enter your password.");

    setBusy(true);
    setStatus(isSignUp ? "Creating your account…" : "Signing you in…");
    try {
      if (isSignUp) await onSignUp(name.trim(), email.trim(), password);
      else await onSignIn(email.trim(), password);
      setStatus("");
    } catch (err) {
      setStatus(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className={`ll${lampOn ? " is-on" : ""}`}>
      <div className="ll-stars" aria-hidden="true">
        {stars.map((s, i) => (
          <span key={i} className="ll-star" style={s} />
        ))}
      </div>
      <div className="ll-room-light" aria-hidden="true" />
      <div className="ll-fireflies" aria-hidden="true">
        {fireflies.map((f, i) => (
          <span key={i} className="ll-firefly" style={f} />
        ))}
      </div>

      <div className="ll-brand">
        <span className="ll-brand-mark" aria-hidden="true">
          <TrendingUp size={18} strokeWidth={2.6} color="var(--gold-ink)" />
        </span>
        VilaiWatch
      </div>

      <div className="ll-top">
        <button
          type="button"
          className="ll-icon-btn"
          aria-pressed={soundOn}
          aria-label={soundOn ? "Sound effects on" : "Sound effects off"}
          onClick={() => setSoundOn(!soundOn)}
        >
          {soundOn ? (
            <Volume2 {...ICON} size={20} />
          ) : (
            <VolumeX {...ICON} size={20} />
          )}
        </button>
      </div>

      <div className="ll-lamp">
        <div className="ll-cone" aria-hidden="true" />
        <div className="ll-shade" aria-hidden="true" />
        <div className="ll-bulb" aria-hidden="true" />
        <div className="ll-pole" aria-hidden="true" />
        <div className="ll-base" aria-hidden="true" />
        <button
          type="button"
          className={`ll-chain${pulled ? " pulled" : ""}`}
          aria-pressed={lampOn}
          aria-label={lampOn ? "Turn the lamp off" : "Turn the lamp on"}
          onClick={pullChain}
        >
          <span className="ll-cord" />
          <span className="ll-bead" />
        </button>
        <span className="ll-hint" aria-hidden="true">
          Pull the chain
        </span>
      </div>

      <section className="ll-card" aria-labelledby="ll-title">
        <div className="ll-tabs" role="tablist" aria-label="Account">
          <button
            type="button"
            role="tab"
            className="ll-tab"
            aria-selected={!isSignUp}
            onClick={() => switchMode("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            role="tab"
            className="ll-tab"
            aria-selected={isSignUp}
            onClick={() => switchMode("signup")}
          >
            Create account
          </button>
        </div>

        <h1 id="ll-title" className="ll-title">
          {isSignUp ? "Create your account" : "Welcome back"}
        </h1>
        <p className="ll-sub">
          {isSignUp
            ? "Track prices and get alerted when they drop."
            : "Sign in to see your watchlist and price alerts."}
        </p>

        <form className="ll-form" onSubmit={handleSubmit} noValidate>
          {isSignUp && (
            <div className="ll-field">
              <label htmlFor="ll-name" className="ll-sr">
                Full name
              </label>
              <User className="ll-lead" {...ICON} />
              <input
                id="ll-name"
                className="ll-input"
                type="text"
                placeholder="Full name"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          )}

          <div className="ll-field">
            <label htmlFor="ll-email" className="ll-sr">
              Email address
            </label>
            <Mail className="ll-lead" {...ICON} />
            <input
              id="ll-email"
              className="ll-input"
              type="email"
              placeholder="Email address"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="ll-field">
            <label htmlFor="ll-password" className="ll-sr">
              Password
            </label>
            <Lock className="ll-lead" {...ICON} />
            <input
              id="ll-password"
              className="ll-input"
              type={showPw ? "text" : "password"}
              placeholder="Password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="ll-eye"
              aria-pressed={showPw}
              aria-label={showPw ? "Hide password" : "Show password"}
              onClick={() => setShowPw(!showPw)}
            >
              {showPw ? <EyeOff {...ICON} /> : <Eye {...ICON} />}
            </button>
          </div>

          <button type="submit" className="ll-primary" disabled={busy}>
            {isSignUp ? "Get started" : "Sign in"}
          </button>
          <p className="ll-status" role="status" aria-live="polite">
            {status}
          </p>
        </form>
      </section>
    </main>
  );
}
