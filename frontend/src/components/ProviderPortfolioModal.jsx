import { useState, useEffect } from "react";

export default function ProviderPortfolioModal({ isOpen, onClose, providerId, providerName }) {
  const [portfolio, setPortfolio] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedImage, setSelectedImage] = useState(null);

  useEffect(() => {
    if (isOpen && providerId) {
      fetchPortfolio();
    }
  }, [isOpen, providerId]);

  const fetchPortfolio = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`http://localhost:5000/api/portfolio/${providerId}`);
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.portfolio || []);
      } else {
        setError(data.message || "Failed to load portfolio.");
      }
    } catch (err) {
      setError("Network error loading provider portfolio.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(20, 16, 8, 0.72)",
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
          maxWidth: "800px",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          boxShadow: "0 24px 60px rgba(0,0,0,0.3)"
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #ebd08d",
            background: "linear-gradient(135deg, #fffcf5, #fef8eb)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "22px" }}>🎨</span>
              <h3 style={{ margin: 0, color: "#382d12", fontSize: "18px", fontWeight: "800" }}>
                {providerName ? `${providerName}'s Work Portfolio` : "Provider Work Portfolio"}
              </h3>
            </div>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#8a7536" }}>
              Real photos and proof of craftsmanship uploaded directly by this provider.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "#fef3c7",
              border: "1px solid #fde68a",
              color: "#92400e",
              borderRadius: "50%",
              width: "34px",
              height: "34px",
              fontSize: "16px",
              fontWeight: "700",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1 }}>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#8a7536" }}>
              <div style={{ fontSize: "32px", marginBottom: "8px" }}>⏳</div>
              <p>Loading real portfolio work...</p>
            </div>
          ) : error ? (
            <div style={{ padding: "16px", borderRadius: "10px", background: "#fef2f2", color: "#b91c1c", fontSize: "14px" }}>
              {error}
            </div>
          ) : portfolio.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "50px 20px",
                background: "#faf8f5",
                borderRadius: "14px",
                border: "1px dashed #ebd08d"
              }}
            >
              <span style={{ fontSize: "40px" }}>📷</span>
              <h4 style={{ margin: "12px 0 6px", color: "#382d12" }}>No Portfolio Items Uploaded Yet</h4>
              <p style={{ margin: 0, fontSize: "13px", color: "#7a6b47" }}>
                This provider has not yet published photos to their public portfolio showcase.
              </p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "16px"
              }}
            >
              {portfolio.map((item) => (
                <div
                  key={item.id}
                  onClick={() => setSelectedImage(item)}
                  style={{
                    borderRadius: "14px",
                    overflow: "hidden",
                    border: item.is_primary ? "2px solid #c98e1b" : "1px solid #ebd08d",
                    background: "#ffffff",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                    cursor: "pointer",
                    transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    position: "relative"
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-3px)")}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
                >
                  <div style={{ position: "relative", height: "170px", backgroundColor: "#f3f0e6" }}>
                    <img
                      src={item.image_url}
                      alt={item.caption || "Provider work"}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80";
                      }}
                    />
                    {item.is_primary && (
                      <span
                        style={{
                          position: "absolute",
                          top: "8px",
                          left: "8px",
                          background: "#c98e1b",
                          color: "#ffffff",
                          fontSize: "10px",
                          fontWeight: "800",
                          padding: "3px 8px",
                          borderRadius: "12px",
                          letterSpacing: "0.5px"
                        }}
                      >
                        ⭐ FEATURED WORK
                      </span>
                    )}
                  </div>
                  {item.caption && (
                    <div style={{ padding: "10px 12px" }}>
                      <p style={{ margin: 0, fontSize: "12px", color: "#382d12", fontWeight: "600", lineHeight: "1.4" }}>
                        {item.caption}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Image Full-View Lightbox */}
        {selectedImage && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.85)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10000,
              padding: "20px"
            }}
            onClick={() => setSelectedImage(null)}
          >
            <div
              style={{ maxWidth: "90%", maxHeight: "90%", position: "relative", textAlign: "center" }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedImage.image_url}
                alt={selectedImage.caption || "Full preview"}
                style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "12px", objectFit: "contain" }}
              />
              {selectedImage.caption && (
                <div
                  style={{
                    marginTop: "12px",
                    color: "#ffffff",
                    fontSize: "14px",
                    fontWeight: "600",
                    background: "rgba(0,0,0,0.6)",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    display: "inline-block"
                  }}
                >
                  {selectedImage.caption}
                </div>
              )}
              <button
                onClick={() => setSelectedImage(null)}
                style={{
                  position: "absolute",
                  top: "-15px",
                  right: "-15px",
                  background: "#ffffff",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid #ebd08d",
            background: "#fffcf5",
            display: "flex",
            justifyContent: "flex-end"
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px",
              borderRadius: "10px",
              border: "1px solid #ebd08d",
              background: "#ffffff",
              color: "#835b0a",
              fontWeight: "700",
              fontSize: "13px",
              cursor: "pointer"
            }}
          >
            Close Portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
