import React from "react";

/**
 * Password Policy Validator Component (Requirement 1)
 * Checks:
 * 1. Minimum 8 characters
 * 2. At least 1 uppercase letter
 * 3. At least 1 lowercase letter
 * 4. At least 1 number
 * 5. At least 1 special character
 */
export const checkPasswordPolicy = (password) => {
  const pwd = password || "";
  return {
    minLength: pwd.length >= 8,
    hasUpper: /[A-Z]/.test(pwd),
    hasLower: /[a-z]/.test(pwd),
    hasNumber: /[0-9]/.test(pwd),
    hasSpecial: /[!@#$%^&*(),.?":{}|<>_\-+=[\]\\;/~`]/.test(pwd)
  };
};

export const isPasswordValid = (password) => {
  const results = checkPasswordPolicy(password);
  return Object.values(results).every(Boolean);
};

export default function PasswordValidator({ password }) {
  if (!password) return null;

  const { minLength, hasUpper, hasLower, hasNumber, hasSpecial } = checkPasswordPolicy(password);

  const rules = [
    { label: "At least 8 characters", met: minLength },
    { label: "At least 1 uppercase letter (A-Z)", met: hasUpper },
    { label: "At least 1 lowercase letter (a-z)", met: hasLower },
    { label: "At least 1 number (0-9)", met: hasNumber },
    { label: "At least 1 special character (!@#$...)", met: hasSpecial }
  ];

  return (
    <div style={{
      background: "#fffdfa",
      border: "1px solid #f1e0a8",
      borderRadius: "10px",
      padding: "10px 14px",
      marginTop: "8px",
      marginBottom: "12px",
      fontSize: "12px"
    }}>
      <p style={{
        margin: "0 0 6px 0",
        fontWeight: "700",
        color: "#6e5200",
        fontSize: "11px",
        textTransform: "uppercase",
        letterSpacing: "0.5px"
      }}>
        Password Requirements:
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px" }}>
        {rules.map((rule, idx) => (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              color: rule.met ? "#15803d" : "#9ca3af",
              fontWeight: rule.met ? "600" : "400",
              transition: "color 0.2s ease"
            }}
          >
            <span>{rule.met ? "✓" : "○"}</span>
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
