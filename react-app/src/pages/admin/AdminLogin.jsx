import { useState } from "react";
import { mount } from "../../mount.jsx";
import { api } from "./lib/api.js";

function AdminLogin() {
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(false);
    setMessage("Checking credentials…");
    try {
      await api.login(form.get("email"), form.get("password"));
      location.replace("./app.html");
    } catch (failure) {
      setError(true);
      setMessage(failure.message);
      setPending(false);
    }
  }

  return (
    <main className="login-shell">
      <a className="admin-brand" href="../">
        Study<span>Orbit</span>247
      </a>
      <section className="login-card">
        <div className="eyebrow">RESTRICTED ACCESS</div>
        <h1>Admin sign in</h1>
        <p className="muted center">Sign in to manage questions, content and publishing.</p>
        <form id="login-form" onSubmit={submit}>
          <label htmlFor="email">Admin email</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            placeholder="abc@gmail.com"
            required
          />
          <label htmlFor="password">Password</label>
          <div className="password-field">
            <input
              id="password"
              name="password"
              type={visible ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter password"
              required
            />
            <button type="button" id="toggle-password" onClick={() => setVisible(!visible)}>
              {visible ? "Hide" : "Show"}
            </button>
          </div>
          <button className="primary full" type="submit" disabled={pending}>
            Secure login <span>→</span>
          </button>
          <p
            id="login-message"
            className={message ? `form-message show ${error ? "error" : ""}` : "form-message"}
            role="status"
          >
            {message}
          </p>
        </form>
        <div className="secure-note">
          <strong>Demo access:</strong> abc@gmail.com
          <br />
          <strong>Password:</strong> 12345678
          <br />
          <br />
          Demo-only login. Questions are saved in this browser; Cloudflare is not connected yet.
        </div>
      </section>
      <a className="back-link" href="../">
        ← Back to StudyOrbit247
      </a>
    </main>
  );
}

mount(AdminLogin);
