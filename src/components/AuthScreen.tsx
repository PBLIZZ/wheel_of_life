import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import type { FormEvent } from "react";

export function AuthScreen() {
  const { signIn } = useAuthActions();
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    setError("");

    try {
      await signIn("google");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Could not start Google sign-in.");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">Private coaching MVP</p>
        <h1>Wheel of Life Coach</h1>
        <p className="lede">
          Score the areas of your life, work through the real friction, then end
          with one goal and one next step you would actually do.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <button className="primary-button" disabled={status === "sending"} type="submit">
            {status === "sending" ? "Redirecting..." : "Continue with Google"}
          </button>
        </form>

        {status === "sent" ? (
          <p className="status-note success">
            Redirecting to Google sign-in...
          </p>
        ) : null}

        {status === "error" ? <p className="status-note error">{error}</p> : null}
      </section>
    </main>
  );
}
