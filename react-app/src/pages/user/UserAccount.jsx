import { useState } from "react";
import { mount } from "../../mount.jsx";

function UserAccount() {
  const [signup, setSignup] = useState(false);
  const [feedback, setFeedback] = useState("");

  function changeMode(next) {
    setSignup(next);
    setFeedback("");
  }

  function social(provider) {
    setFeedback(provider + " sign-in is not connected yet. OAuth setup is required.");
  }

  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setFeedback(
      signup && data.get("password") !== data.get("confirm")
        ? "Passwords do not match."
        : "Authentication backend is not connected yet. No account was created and no login session was started.",
    );
  }

  return (
    <main className="shell">
      <div className="brand">
        Study<em>Orbit</em>247
      </div>
      <section className="card" aria-labelledby="title">
        <div className="eyebrow">STUDENT ACCOUNT</div>
        <h1 id="title">{signup ? "Create your account" : "Welcome back"}</h1>
        <p className="intro" id="intro">
          {signup
            ? "Create an account to save your preparation and track progress."
            : "Login to continue your learning journey."}
        </p>
        <div className="tabs" role="tablist" aria-label="Student account access">
          <button
            className={signup ? "tab" : "tab active"}
            onClick={() => changeMode(false)}
            id="login-tab"
            type="button"
            role="tab"
            aria-selected={!signup}
          >
            Login
          </button>
          <button
            className={signup ? "tab active" : "tab"}
            id="signup-tab"
            onClick={() => changeMode(true)}
            type="button"
            role="tab"
            aria-selected={signup}
          >
            Sign Up
          </button>
        </div>
        <form id="user-form" onSubmit={submit}>
          <label id="name-label" hidden={!signup}>
            Full name
            <input name="name" type="text" autoComplete="name" placeholder="Enter your name" />
          </label>
          <label>
            Email address
            <input name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={signup ? "new-password" : "current-password"}
              minLength="8"
              placeholder="At least 8 characters"
              required
            />
          </label>
          <label id="confirm-label" hidden={!signup}>
            Confirm password
            <input
              name="confirm"
              disabled={!signup}
              type="password"
              autoComplete="new-password"
              minLength="8"
              placeholder="Re-enter your password"
            />
          </label>
          <button className="submit" id="submit" type="submit">
            {signup ? "Create Account" : "Login"}
          </button>
          <div className="forgot-wrap" id="forgot-wrap" hidden={signup}>
            <button
              className="forgot-btn"
              id="forgot-btn"
              onClick={() =>
                setFeedback(
                  "Password reset will be available after secure email authentication is connected.",
                )
              }
              type="button"
            >
              Forgot password?
            </button>
          </div>
          <p className="feedback" id="feedback" aria-live="polite">
            {feedback}
          </p>
        </form>
        <div className={signup ? "social-divider signup-spacing" : "social-divider"}>OR CONTINUE WITH</div>
        <div className="social-login" aria-label="Social sign in options">
          <button className="social-btn" type="button" onClick={() => social("Google")}>
            <svg viewBox="0 0 48 48" aria-hidden="true">
              <path
                fill="#EA4335"
                d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
              />
              <path
                fill="#4285F4"
                d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.76 7.18l7.73 6C44.42 37.97 46.98 31.8 46.98 24.55z"
              />
              <path
                fill="#FBBC05"
                d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78z"
              />
              <path
                fill="#34A853"
                d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.14 1.44-4.89 2.3-8.18 2.3-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
              />
            </svg>
            Continue with Google
          </button>
          <button className="social-btn" type="button" onClick={() => social("Facebook")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#1877F2"
                d="M24 12a12 12 0 1 0-13.875 11.85v-8.38H7.08V12h3.045V9.35c0-3.005 1.79-4.665 4.53-4.665 1.312 0 2.685.234 2.685.234v2.953h-1.512c-1.49 0-1.955.925-1.955 1.874V12h3.328l-.532 3.47h-2.796v8.38A12.002 12.002 0 0 0 24 12"
              />
            </svg>
            Continue with Facebook
          </button>
          <button className="social-btn" type="button" onClick={() => social("Apple")}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#171512"
                d="M16.37 12.1c.02 2.16 1.9 2.88 1.92 2.89-.02.05-.3 1.04-.99 2.06-.6.9-1.22 1.8-2.2 1.82-.96.02-1.27-.59-2.37-.59s-1.45.57-2.35.61c-.94.04-1.66-.98-2.27-1.88-1.24-1.82-2.18-5.15-.91-7.4.63-1.12 1.76-1.83 2.98-1.85.93-.02 1.8.65 2.37.65.57 0 1.64-.8 2.77-.68.47.02 1.8.19 2.65 1.43-.07.04-1.58.92-1.6 2.94M14.55 5.9c.5-.6.83-1.43.74-2.26-.72.03-1.6.48-2.12 1.08-.47.54-.88 1.39-.77 2.2.81.06 1.65-.41 2.15-1.02"
              />
            </svg>
            Continue with Apple
          </button>
        </div>
        <p className="note">
          Student login and signup interface is ready. Secure authentication, account creation and saved
          cross-device learning data will work after connecting the authentication backend.
        </p>
      </section>
      <p className="back">
        <a href="../">← Back to StudyOrbit247</a>
      </p>
    </main>
  );
}

mount(UserAccount);
