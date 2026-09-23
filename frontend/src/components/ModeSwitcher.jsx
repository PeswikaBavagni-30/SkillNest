import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ModeSwitcher() {
  const { user, switchMode } = useAuth();
  const navigate = useNavigate();
  const [switching, setSwitching] = useState(false);

  // If user is Admin or has not registered with the same email as both Customer and Provider, never render mode switcher
  if (!user || user?.role === "ADMIN" || !user?.can_switch_mode) {
    return null;
  }

  // Active role determines current UI view
  const isProvider = user?.role === "PROVIDER" || user?.active_role === "PROVIDER";

  const handleToggleMode = async () => {
    setSwitching(true);
    try {
      const targetMode = isProvider ? "customer" : "provider";
      await switchMode(targetMode);
      if (targetMode === "provider") {
        navigate("/provider-dashboard");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("Mode switch error:", err);
      alert(err.message || "Failed to switch mode.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <button
      onClick={handleToggleMode}
      disabled={switching}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 14px",
        background: isProvider ? "#fef3c7" : "#f0f9ff",
        border: isProvider ? "1px solid #ebd08d" : "1px solid #bae6fd",
        borderRadius: "20px",
        color: isProvider ? "#835b0a" : "#0369a1",
        fontWeight: "700",
        fontSize: "12px",
        cursor: switching ? "wait" : "pointer",
        boxShadow: "0 2px 5px rgba(0,0,0,0.06)",
        transition: "all 0.2s ease"
      }}
      title={isProvider ? "Switch to Customer browsing mode" : "Switch back to Provider dashboard"}
    >
      <span>{isProvider ? "⇄ Customer Mode" : "⇄ Provider Dashboard"}</span>
    </button>
  );
}
