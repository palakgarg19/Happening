import React from "react";

// 1. COPIED HELPER from MyBookings.jsx to show refund status
const getRefundStatus = (paymentStatus) => {
  switch (paymentStatus) {
    case "refunded":
      return (
        <span style={{ color: "var(--success-color)", fontWeight: "bold" }}>✅ Refunded</span>
      );
    case "refund_failed":
      return (
        <span style={{ color: "var(--danger-color)", fontWeight: "bold" }}>❌ Refund Failed</span>
      );
    case "succeeded":
      return (
        <span style={{ color: "var(--warning-color)", fontWeight: "bold" }}>
          ⏳ Refund Processing
        </span>
      );
    default:
      return (
        <span style={{ color: "var(--text-muted)", fontWeight: "bold" }}>ℹ️ N/A</span>
      );
  }
};

// 2. COPIED HELPER to show booking status (e.g., "Cancelled")
const getBookingStatusBadge = (status) => {
  let className = "";
  let text = status;
  switch (status) {
    case "confirmed":
      className = "badge-success";
      text = "Confirmed";
      break;
    case "cancelled":
      className = "badge-danger";
      text = "Cancelled";
      break;
    default:
      className = "badge-secondary";
      text = "Pending";
      break;
  }
  return (
    <span className={`badge ${className}`} style={{ fontSize: '0.8rem' }}>
      {text}
    </span>
  );
};

function EventBookingsModal({ bookings, eventTitle, onClose }) {
  
  // 3. CALCULATE TOTALS
  const totalBookings = bookings.length;
  const totalRevenue = bookings.reduce((acc, b) => {
    // Only count revenue from bookings that weren't cancelled
    if (b.status === 'confirmed') {
      return acc + parseFloat(b.total_amount);
    }
    return acc;
  }, 0);
  const totalTickets = bookings.reduce((acc, b) => acc + b.ticket_count, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "700px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Bookings for: {eventTitle}</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          
          {/* 4. ADDED SUMMARY HEADER */}
          <div className="card card-body" style={{ marginBottom: '1.5rem', backgroundColor: '#f8f9fa' }}>
            <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center' }}>
              <div>
                <h4 style={{ margin: 0 }}>Rs. {totalRevenue.toFixed(2)}</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Revenue</p>
              </div>
              <div>
                <h4 style={{ margin: 0 }}>{totalBookings}</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Bookings</p>
              </div>
              <div>
                <h4 style={{ margin: 0 }}>{totalTickets}</h4>
                <p style={{ margin: 0, color: 'var(--text-muted)' }}>Total Tickets Sold</p>
              </div>
            </div>
          </div>
          
          {/* 5. REDESIGNED LIST */}
          {bookings.length === 0 ? (
            <div className="card card-body" style={{ textAlign: "center" }}>
              <p>No bookings found for this event.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="card"
                  style={{
                    padding: '0.75rem 1rem',
                    display: 'flex',
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: booking.status === 'cancelled' ? 0.7 : 1
                  }}
                >
                  {/* Left Side: User Info */}
                  <div>
                    <h5 style={{ margin: 0 }}>{booking.user_name}</h5>
                    <p style={{ margin: '0 0 5px 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      {booking.user_email}
                    </p>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>
                      <strong>Tickets:</strong> {booking.ticket_count}
                      {" | "}
                      <strong>Total:</strong> Rs. {booking.total_amount}
                    </p>
                  </div>
                  
                  {/* Right Side: Status */}
                  <div style={{ textAlign: 'right' }}>
                    {getBookingStatusBadge(booking.status)}
                    {booking.status === 'cancelled' && (
                      <div style={{ marginTop: '5px', fontSize: '0.9rem' }}>
                        {getRefundStatus(booking.payment_status)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventBookingsModal;