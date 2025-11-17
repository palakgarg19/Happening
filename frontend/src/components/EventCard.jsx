import { useState } from "react";
import { getDefaultImage } from '../utils.js';

function EventCard({ event, onBook, user, onLoginClick, onViewDetail }) {
  const [ticketCount, setTicketCount] = useState(1);
  const isPending = event.approval_status === "pending";
  const isRejected = event.approval_status === "rejected";
  const isSoldOut = event.available_tickets === 0;

  const defaultImage = getDefaultImage(event.category);
  const imageUrl = event.image_url || defaultImage;

  // Handler for decrementing count
  const handleDecrement = () => {
    setTicketCount((prevCount) => Math.max(1, prevCount - 1));
  };

  // Handler for incrementing count
  const handleIncrement = () => {
    setTicketCount((prevCount) =>
      Math.min(prevCount + 1, event.available_tickets)
    );
  };
  const handleBooking = async () => {
    try {
      await onBook(event.id, ticketCount);
      setTicketCount(1);
    } catch (error) {
      console.log("Booking failed or was cancelled:", error.message);
    }
  };

  return (
    <div
      className={`event-card ${isPending ? "pending" : ""}`}
      style={{ opacity: isPending ? 0.7 : 1 }}
    >
      <img
        src={imageUrl}
        alt={event.title}
        className="event-card-image"
        onError={(e) => {
          e.target.src = defaultImage;
        }}
      />
      <div className="event-card-body">
        {isPending && (
          <span className="badge badge-warning">Pending Approval</span>
        )}
        {isRejected && <span className="badge badge-danger">Rejected</span>}

        <h3 style={{ marginBottom: "0.5rem" }}>
          <button
            className="btn-link"
            onClick={() => onViewDetail(event.id)}
            style={{ fontSize: "1.2rem", padding: 0, textAlign: "left" }}
          >
            {event.title}
          </button>
        </h3>

        <div className="event-card-info">
          <p>
            <strong>Date:</strong>{" "}
            {new Date(event.date_time).toLocaleString()}
          </p>
          <p>
            <strong>Price:</strong> Rs. {event.price}/-
          </p>
          <p>
            <strong>Tickets:</strong> {event.available_tickets} /{" "}
            {event.total_tickets} left
          </p>
          <p>
            <strong>Category:</strong> {event.category}
          </p>
                    <p>
            <strong>Venue:</strong> {event.venue}
          </p>
        </div>

        <p className="event-card-description">{event.description}</p>

        {isRejected && event.admin_notes && (
          <div className="info-box info-box-danger">
            <strong>Admin Feedback:</strong> {event.admin_notes}
          </div>
        )}

        <div className="event-card-footer">
          {user ? (
            <>
              <div className="quantity-selector">
                <button
                  className="btn btn-secondary"
                  onClick={handleDecrement}
                  disabled={isSoldOut}
                >
                  -
                </button>
                <span className="quantity-display">{ticketCount}</span>
                <button
                  className="btn btn-secondary"
                  onClick={handleIncrement}
                  disabled={isSoldOut || ticketCount >= event.available_tickets}
                >
                  +
                </button>
              </div>
              <button
                className="btn btn-success"
                onClick={handleBooking}
                disabled={isPending || isRejected || isSoldOut}
                style={{ flexGrow: 1 }}
              >
                {isSoldOut ? "Sold Out" : `Book ${ticketCount} Ticket(s)`}
              </button>
            </>
          ) : (
            <button className="btn-link" onClick={onLoginClick}>
              Login to book tickets
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default EventCard;
