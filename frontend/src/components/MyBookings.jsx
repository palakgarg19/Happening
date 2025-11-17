import { useMemo, useEffect } from "react";
import { getDefaultImage } from '../utils.js';

function MyBookings({
  myBookings,
  onCancel,
  onRefresh,
  onResumePayment,
  onViewDetail,
  onCancelPending,
  activeTab,
  setActiveTab,
  highlightEventId,
  setHighlightEventId,
}) {
  const getRefundStatus = (paymentStatus) => {
    switch (paymentStatus) {
      case "refunded":
        return (
          <span style={{ color: "var(--success-color)", fontWeight: "bold" }}>
            ✅ Refunded
          </span>
        );
      case "refund_failed":
        return (
          <span style={{ color: "var(--danger-color)", fontWeight: "bold" }}>
            ❌ Refund Failed
          </span>
        );
      case "succeeded":
        return (
          <span style={{ color: "var(--warning-color)", fontWeight: "bold" }}>
            ⏳ Refund Processing
          </span>
        );
      default:
        return (
          <span style={{ color: "var(--text-muted)", fontWeight: "bold" }}>
            ℹ️ Payment Not Made
          </span>
        );
    }
  };

  const categorizedBookings = useMemo(() => {
    return myBookings.reduce(
      (acc, booking) => {
        if (booking.status === "confirmed") {
          acc.confirmed.push(booking);
        } else if (booking.status === "pending") {
          acc.pending.push(booking);
        } else if (booking.status === "cancelled") {
          acc.cancelled.push(booking);
        }
        return acc;
      },
      { confirmed: [], pending: [], cancelled: [] }
    );
  }, [myBookings]);
  useEffect(() => {
    if (highlightEventId) {
      const timer = setTimeout(() => {
        setHighlightEventId(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [highlightEventId, setHighlightEventId]);

  const bookingsToDisplay = categorizedBookings[activeTab];

  const truncate = (str, n) => {
    return str?.length > n ? str.substr(0, n - 1) + "..." : str;
  };

  return (
    <div className="my-bookings-page">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>My Bookings</h2>
        <button className="btn btn-secondary" onClick={onRefresh}>
          Refresh Bookings
        </button>
      </div>

      <div className="dashboard-tabs">
        <button
          className={`tab-btn ${activeTab === "confirmed" ? "active" : ""}`}
          onClick={() => setActiveTab("confirmed")}
        >
          Confirmed ({categorizedBookings.confirmed.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
        >
          Pending Payment ({categorizedBookings.pending.length})
        </button>
        <button
          className={`tab-btn ${activeTab === "cancelled" ? "active" : ""}`}
          onClick={() => setActiveTab("cancelled")}
        >
          Cancelled ({categorizedBookings.cancelled.length})
        </button>
      </div>

      <div className="tab-content">
        {myBookings.length === 0 ? (
          <div className="card card-body" style={{ textAlign: "center" }}>
            <p>You have no bookings yet. Go find an event!</p>
          </div>
        ) : bookingsToDisplay.length === 0 ? (
          <div className="card card-body" style={{ textAlign: "center" }}>
            <p>No bookings found in this category.</p>
          </div>
        ) : (
          <div
            className="bookings-list"
            style={{ display: "flex", flexDirection: "column", gap: "0rem" }}
          >
            {bookingsToDisplay.map((booking) => {
              const defaultImage = getDefaultImage(booking.category);
              const imageUrl = booking.image_url || defaultImage;

              // === NEW LOGIC ===
              // Check if the event is cancellable based on the 24-hour rule
              const now = new Date();
              const eventDate = new Date(booking.event_date);
              const hoursUntilEvent = (eventDate - now) / (1000 * 60 * 60);
              const isCancellable = hoursUntilEvent > 24;
              const isEventOver = eventDate < now;

              return (
                <div
                  key={booking.id}
                  className={`card ${
                    booking.event_id === highlightEventId
                      ? "booking-highlight"
                      : ""
                  }`}
                  ref={(el) => {
                    // If this is the highlighted event, scroll to it
                    if (booking.event_id === highlightEventId) {
                      el?.scrollIntoView({
                        behavior: "smooth",
                        block: "center",
                      });
                    }
                  }}
                  style={{
                    backgroundColor: "var(--white)",
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "stretch",
                    padding: "0",
                    overflow: "hidden",
                  }}
                >
                  {/* === COLUMN 1: IMAGE === */}
                  <div style={{ flexShrink: 0, width: "150px" }}>
                    <img
                      src={imageUrl}
                      alt={booking.event_title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        display: "block",
                      }}
                      onError={(e) => {
                        e.target.src = defaultImage;
                      }}
                    />
                  </div>

                  {/* === COLUMN 2: DETAILS === */}
                  <div
                    style={{
                      flexGrow: 1,
                      padding: "1rem 1.25rem",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <h4
                      style={{ margin: "0 0 0.25rem 0", fontSize: "1.25rem" }}
                    >
                      <button
                        className="btn-link"
                        onClick={() => onViewDetail(booking.event_id)}
                        style={{
                          fontSize: "1.25rem",
                          padding: 0,
                          textAlign: "left",
                          fontWeight: "bold",
                        }}
                      >
                        {booking.event_title}
                      </button>
                    </h4>

                    <p
                      style={{
                        fontSize: "0.9rem",
                        color: "var(--text-muted)",
                        margin: "0.25rem 0 1rem 0",
                        flexGrow: 1,
                      }}
                    >
                      {truncate(booking.event_description, 100)}
                    </p>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.5rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      <div>
                        <p style={{ margin: 0 }}>
                          <strong>Date:</strong>{" "}
                          {new Date(booking.event_date).toLocaleString()}
                        </p>
                        <p style={{ margin: 0 }}>
                          <strong>Tickets:</strong> {booking.ticket_count}
                        </p>
                      </div>
                      <div>
                        <p style={{ margin: 0 }}>
                          <strong>Total:</strong> Rs. {booking.total_amount}
                        </p>
                        {booking.status === "cancelled" && (
                          <p style={{ margin: 0 }}>
                            <strong>Refund:</strong>{" "}
                            {getRefundStatus(booking.payment_status)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* === COLUMN 3: ACTIONS === */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: "180px",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between", // <-- THIS IS THE CHANGE
                      alignItems: "flex-end",
                      borderLeft: "1px solid var(--border-color)",
                      backgroundColor: booking.status === "var(--white)",
                    }}
                  >
                    {/* --- TOP-RIGHT ACTION --- */}
                    <div>
                      {booking.status === "pending" && (
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => onCancelPending(booking.id)}
                          title="Cancel this booking"
                          style={{ padding: "0.2rem 0.5rem", lineHeight: "1" }} // Makes it a small "X" button
                        >
                          X
                        </button>
                      )}
                    </div>

                    {/* --- BOTTOM-RIGHT ACTIONS --- */}
                    <div
                      style={{
                        marginTop: "1rem",
                        display: "flex",
                        gap: "0.5rem",
                      }}
                    >
                      {booking.status === "confirmed" && isCancellable && (
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => onCancel(booking.id)}
                        >
                          Cancel Booking
                        </button>
                      )}

                      {booking.status === "confirmed" && !isCancellable && (
                        <p
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-muted)",
                            textAlign: "right",
                          }}
                        >
                          Cancellation window (24h) has passed.
                        </p>
                      )}

                      {booking.status === "pending" &&
                        (isEventOver ? (
                          <p
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--danger-color)",
                              textAlign: "right",
                              fontWeight: "bold",
                            }}
                          >
                            This event has already passed.
                          </p>
                        ) : (
                          <button
                            className="btn btn-success-outline btn-sm"
                            onClick={() => onResumePayment(booking.id)}
                          >
                            Pay Now (Rs. {booking.total_amount})
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default MyBookings;
