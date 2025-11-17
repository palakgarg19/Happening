import { useState } from "react";
import { getDefaultImage } from "../utils.js";

function EventDetailPage({ event, user, onBook, onLoginClick, onBack }) {
  const [ticketCount, setTicketCount] = useState(1);
  const isSoldOut = event.available_tickets === 0;

  const defaultImage = getDefaultImage(event.category);
  const imageUrl = event.image_url || defaultImage;

  const handleDecrement = () => {
    setTicketCount((prevCount) => Math.max(1, prevCount - 1));
  };

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

  if (!event) {
    return (
      <div>
        <h2>Event Not Found</h2>
        <button className="btn btn-secondary" onClick={onBack}>
          &larr; Back to Events
        </button>
      </div>
    );
  }

  return (
    <div className="event-detail-page">
      <button
        className="btn btn-secondary"
        onClick={onBack}
        style={{ marginBottom: "1rem" }}
      >
        &larr; Back to All Events
      </button>

      <div className="card">
        <img
          src={imageUrl}
          alt={event.title}
          className="event-card-image"
          style={{ width: "100%", height: "300px", objectFit: "cover" }}
          onError={(e) => {
            e.target.src = defaultImage;
          }}
        />
        <div className="card-body" style={{ padding: "2rem" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
            }}
          >
            <div style={{ flex: "2", paddingRight: "2rem" }}>
              <span
                className="badge badge-info"
                style={{ marginBottom: "1rem" }}
              >
                {event.category}
              </span>
              <h2>{event.title}</h2>
              <p style={{ fontSize: "1.1rem", color: "var(--text-muted)" }}>
                Organized by: {event.organizer_name}
              </p>
              <hr style={{ margin: "1.5rem 0" }} />
              <p style={{ fontSize: "1rem", lineHeight: "1.7" }}>
                {event.description}
              </p>
            </div>

            <div
              className="card"
              style={{
                flex: "1",
                minWidth: "300px",
                position: "sticky",
                top: "100px",
              }}
            >
              <div className="card-body">
                <h4>Event Details</h4>
                <p>
                  <strong>Date:</strong>{" "}
                  {new Date(event.date_time).toLocaleString()}
                </p>
                <p>
                  <strong>Venue:</strong> {event.venue}
                </p>
                <hr />
                <h4>Tickets</h4>
                <p
                  style={{
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                    color: "var(--primary-color)",
                  }}
                >
                  Rs. {event.price}
                </p>
                <p>
                  <span className="badge badge-warning">
                    {event.available_tickets} / {event.total_tickets} tickets
                    left
                  </span>
                </p>

                <div
                  className="event-card-footer"
                  style={{ borderTop: "none", paddingTop: "1rem" }}
                >
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
                          disabled={
                            isSoldOut || ticketCount >= event.available_tickets
                          }
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="btn btn-success"
                        onClick={handleBooking}
                        disabled={isSoldOut}
                        style={{ flexGrow: 1 }}
                      >
                        {isSoldOut
                          ? "Sold Out"
                          : `Book ${ticketCount} Ticket(s)`}
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default EventDetailPage;
