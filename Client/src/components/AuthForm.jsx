import { useState } from "react";

function AuthForm({ onAuthSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validateRegistration = () => {
    const username = form.username.trim();
    const email = form.email.trim();
    const password = form.password;

    // Username validation
    if (username.length < 3 || username.length > 20) {
      return "Username must be between 3 and 20 characters.";
    }

    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return "Username can only contain letters, numbers, and underscores.";
    }

    // Email validation
    if (!email) {
      return "Email is required.";
    }

    // Basic real-world email format validation
    const emailRegex =
      /^[a-zA-Z0-9](?:[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]*[a-zA-Z0-9])?@[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+$/;

    if (!emailRegex.test(email)) {
      return "Please enter a valid email address.";
    }

    // Password validation
    if (password.length < 8) {
      return "Password must be at least 8 characters long.";
    }

    if (!/[A-Z]/.test(password)) {
      return "Password must contain at least one uppercase letter.";
    }

    if (!/[a-z]/.test(password)) {
      return "Password must contain at least one lowercase letter.";
    }

    if (!/[0-9]/.test(password)) {
      return "Password must contain at least one number.";
    }

    return "";
  };

  const validateLogin = () => {
    if (!form.email.trim()) {
      return "Email is required.";
    }

    if (!form.password) {
      return "Password is required.";
    }

    return "";
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    // Clear old error when user starts correcting the field
    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    // Frontend validation
    const validationError =
      mode === "register" ? validateRegistration() : validateLogin();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = mode === "login" ? "/login" : "/register";

      const payload =
        mode === "login"
          ? {
              email: form.email.trim(),
              password: form.password,
            }
          : {
              username: form.username.trim(),
              email: form.email.trim(),
              password: form.password,
            };

      const response = await fetch(
        `http://localhost:5000/api/users${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Authentication failed");
      }

      if (mode === "register") {
        setMode("login");
        setForm({
          username: "",
          email: "",
          password: "",
        });

        setError("Registration successful. Please log in.");
        return;
      }

      onAuthSuccess(data.user, data.token);
    } catch (err) {
      setError(err.message || "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo-icon">J</div>
          <div className="brand-badge">JibzConnect</div>

          <h2>{mode === "login" ? "Welcome back" : "Create account"}</h2>

          <p>
            {mode === "login"
              ? "Sign in to continue to your workspace"
              : "Register to start chatting with your team"}
          </p>
        </div>

        <div className="auth-toggle">
          <button
            type="button"
            className={mode === "login" ? "active" : ""}
            onClick={() => {
              setMode("login");
              setError("");
            }}
          >
            Login
          </button>

          <button
            type="button"
            className={mode === "register" ? "active" : ""}
            onClick={() => {
              setMode("register");
              setError("");
            }}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === "register" && (
            <div className="form-group">
              <label htmlFor="username">Username</label>

              <input
                id="username"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="Enter your username"
                minLength={3}
                maxLength={20}
                autoComplete="username"
                required
              />

              <small>
                3–20 characters. Letters, numbers, and underscores only.
              </small>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>

            <input
              id="email"
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="Enter your email"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>

            <input
              id="password"
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Enter your password"
              minLength={mode === "register" ? 8 : undefined}
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              required
            />

            {mode === "register" && (
              <small>
                Minimum 8 characters, including uppercase, lowercase, and a
                number.
              </small>
            )}
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-submit" disabled={isLoading}>
            {isLoading
              ? "Please wait..."
              : mode === "login"
                ? "Login"
                : "Register"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AuthForm;
