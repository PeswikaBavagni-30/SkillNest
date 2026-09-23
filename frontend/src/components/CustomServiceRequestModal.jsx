import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function CustomServiceRequestModal({ isOpen, onClose, onRequestCreated, categories = [] }) {
  const { token, user } = useAuth();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]?.category_name || "Tailoring & Apparel");
  const [categoryId, setCategoryId] = useState(categories[0]?.category_id || "");
  const [description, setDescription] = useState("");
  const [budget, setBudget] = useState("");
  const [deadline, setDeadline] = useState("");
  const [city, setCity] = useState(user?.city || user?.location?.city || "Kottayam");
  const [stateName, setStateName] = useState(user?.state || user?.location?.state || "Kerala");
  const [pincode, setPincode] = useState(user?.pincode || user?.location?.pincode || "");
  const [area, setArea] = useState(user?.address || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please specify what service you need.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe your custom requirement in detail.");
      return;
    }
    if (!budget || Number(budget) <= 0) {
      setError("Please enter a realistic estimated budget in ₹.");
      return;
    }
    if (!city.trim()) {
      setError("Please specify the city where service is needed.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5000/api/service-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          category_id: categoryId || null,
          description: description.trim(),
          budget: Number(budget),
          deadline: deadline || null,
          preferred_date: deadline || null,
          city: city.trim(),
          state: stateName.trim(),
          pincode: pincode.trim(),
          area: area.trim(),
          location: (area ? `${area}, ${city}` : city).trim()
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to submit request.");
      }

      if (onRequestCreated) {
        onRequestCreated(data.request);
      }
      onClose();
    } catch (err) {
      setError(err.message || "Unable to submit custom service request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(20, 16, 8, 0.7)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px"
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 50px rgba(0,0,0,0.25)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #ebd08d",
            background: "linear-gradient(135deg, #fffbf0, #fef6e2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <h3 style={{ margin: 0, color: "#382d12", fontSize: "18px", fontWeight: "800" }}>
              ✨ Request a Custom Service
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#8a7536" }}>
              Can't find an exact pre-listed service? Post your custom requirement and get competitive quotes.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#fef3c7",
              border: "1px solid #fde68a",
              color: "#92400e",
              borderRadius: "50%",
              width: "32px",
              height: "32px",
              fontSize: "15px",
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "24px" }}>
          {error && (
            <div
              style={{
                padding: "12px 16px",
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "#b91c1c",
                borderRadius: "10px",
                fontSize: "13px",
                marginBottom: "16px"
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
              What do you need done? *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Bridal blouse stitching with custom embroidery, 3-course dinner catering..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #ebd08d",
                fontSize: "14px"
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", marginBottom: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                Service Category
              </label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  const matched = categories.find((c) => c.category_name === e.target.value);
                  if (matched) setCategoryId(matched.category_id);
                }}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #ebd08d",
                  fontSize: "14px",
                  background: "#fff"
                }}
              >
                {categories.length > 0 ? (
                  categories.map((c) => (
                    <option key={c.category_id} value={c.category_name}>
                      {c.category_name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Tailoring & Alterations">Tailoring & Alterations</option>
                    <option value="Home Cooking & Catering">Home Cooking & Catering</option>
                    <option value="Mehendi & Henna Art">Mehendi & Henna Art</option>
                    <option value="Beauty & Salon Services">Beauty & Salon Services</option>
                    <option value="Electrical & Appliances">Electrical & Appliances</option>
                    <option value="Home Cleaning">Home Cleaning</option>
                    <option value="Other Custom Service">Other Custom Service</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
                Target Budget (₹) *
              </label>
              <input
                type="number"
                required
                min="50"
                placeholder="e.g. 1500"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid #ebd08d",
                  fontSize: "14px"
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
              Detailed Description & Specifications *
            </label>
            <textarea
              required
              rows="4"
              placeholder="Describe sizes, materials, patterns, diet requirements, or specific tools needed..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #ebd08d",
                fontSize: "14px",
                resize: "vertical"
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "700", color: "#382d12", marginBottom: "6px" }}>
              Required By / Deadline
            </label>
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid #ebd08d",
                fontSize: "14px"
              }}
            />
          </div>

          <div style={{ padding: "14px", background: "#fefbf3", border: "1px solid #f1e0a8", borderRadius: "12px", marginBottom: "20px" }}>
            <div style={{ fontSize: "12px", fontWeight: "800", color: "#835b0a", marginBottom: "10px", textTransform: "uppercase" }}>
              📍 Service Delivery Location
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                  City *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kottayam, Bengaluru"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ebd08d",
                    fontSize: "13px",
                    background: "#ffffff"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                  State
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kerala, Karnataka"
                  value={stateName}
                  onChange={(e) => setStateName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ebd08d",
                    fontSize: "13px",
                    background: "#ffffff"
                  }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                  PIN Code
                </label>
                <input
                  type="text"
                  placeholder="e.g. 686001"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ebd08d",
                    fontSize: "13px",
                    background: "#ffffff"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "700", color: "#382d12", marginBottom: "4px" }}>
                  Area / Street Address
                </label>
                <input
                  type="text"
                  placeholder="e.g. Near Baker Junction, Collectorate P.O."
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: "8px",
                    border: "1px solid #ebd08d",
                    fontSize: "13px",
                    background: "#ffffff"
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                border: "1px solid #ebd08d",
                background: "#ffffff",
                color: "#835b0a",
                fontWeight: "700",
                fontSize: "13px",
                cursor: "pointer"
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 24px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #e4a62b, #c98e1b)",
                color: "#ffffff",
                fontWeight: "700",
                fontSize: "14px",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: "0 4px 14px rgba(201, 142, 27, 0.35)"
              }}
            >
              {loading ? "Submitting..." : "Submit Custom Request →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
