import { useState } from "react";
import "./Login.css";

function Login({ onLogin }) {
  const [isSignup, setIsSignup] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage("");

    try {
      const url = isSignup
        ? "http://localhost:5000/api/auth/signup"
        : "http://localhost:5000/api/auth/login";

      const body = isSignup
        ? {
            name: formData.name,
            email: formData.email,
            password: formData.password,
          }
        : {
            email: formData.email,
            password: formData.password,
          };

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      // Server error
      if (!response.ok) {
        setMessage(
          `❌ ${data.message || "Something went wrong"}`
        );
        return;
      }

      // =========================
      // SIGNUP SUCCESS
      // =========================

      if (isSignup) {
        setMessage(
          "✅ Account created successfully! Please login."
        );

        setFormData({
          name: "",
          email: "",
          password: "",
        });

        setTimeout(() => {
          setIsSignup(false);
          setMessage("");
        }, 1500);

        return;
      }

      // =========================
      // LOGIN SUCCESS
      // =========================

      if (data.token) {
        // Save JWT token
        localStorage.setItem("token", data.token);

        // Save logged-in user
        if (data.user) {
          localStorage.setItem(
            "user",
            JSON.stringify(data.user)
          );
        }

        setMessage("✅ Login successful!");

        // Tell App.jsx that login is successful
        onLogin();
      } else {
        setMessage("❌ Login token not received");
      }
    } catch (error) {
      console.log("Login error:", error);

      setMessage(
        "❌ Unable to connect to server"
      );
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        {/* ICON */}

        <div className="login-icon">
          🎓
        </div>

        {/* TITLE */}

        <h1>StudentHub</h1>

        <p className="login-subtitle">
          {isSignup
            ? "Create your account"
            : "Login to your student management system"}
        </p>

        {/* FORM */}

        <form onSubmit={handleSubmit}>

          {/* NAME - SIGNUP ONLY */}

          {isSignup && (
            <div className="login-group">

              <label>Full Name</label>

              <input
                type="text"
                name="name"
                placeholder="Enter your name"
                value={formData.name}
                onChange={handleChange}
                required
              />

            </div>
          )}

          {/* EMAIL */}

          <div className="login-group">

            <label>Email</label>

            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
              required
            />

          </div>

          {/* PASSWORD */}

          <div className="login-group">

            <label>Password</label>

            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleChange}
              minLength="6"
              required
            />

          </div>

          {/* SUBMIT BUTTON */}

          <button
            type="submit"
            className="login-btn"
          >
            {isSignup
              ? "Create Account"
              : "Login"}
          </button>

        </form>

        {/* MESSAGE */}

        {message && (
          <div className="login-message">
            {message}
          </div>
        )}

        {/* LOGIN / SIGNUP SWITCH */}

        <div className="login-switch">

          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}

          <button
            type="button"
            onClick={() => {
              setIsSignup(!isSignup);

              setMessage("");

              setFormData({
                name: "",
                email: "",
                password: "",
              });
            }}
          >
            {isSignup
              ? "Login"
              : "Sign Up"}
          </button>

        </div>

      </div>

    </div>
  );
}

export default Login;