import React, { useState } from "react";
import { getDefaultImage } from '../utils.js';

/**
 * Component for the "Analytics Dashboard" tab
 */
function AnalyticsDashboardTab({ analytics }) {
  if (!analytics) {
    return <div className="loading-spinner">Loading Analytics...</div>;
  }

  const { stats, popularEvents, capacity } = analytics;

  return (
    <div>
      <h3>Dashboard</h3>
      {/* 1. Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <p className="stat-card-title">Total Revenue</p>
          <h2 className="stat-card-value">Rs. {stats.total_revenue}</h2>
        </div>
        <div className="stat-card">
          <p className="stat-card-title">Confirmed Bookings</p>
          <h2 className="stat-card-value">{stats.total_confirmed_bookings}</h2>
        </div>
        <div className="stat-card">
          <p className="stat-card-title">Active Events</p>
          <h2 className="stat-card-value">{stats.total_active_events}</h2>
        </div>
        <div className="stat-card">
          <p className="stat-card-title">Approved Hosts</p>
          <h2 className="stat-card-value">{stats.total_approved_hosts}</h2>
        </div>
      </div>

      {/* 2. Popular Events & Capacity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1fr",
          gap: "1.5rem",
        }}
      >
        <div className="card">
          <div className="card-header">
            <h4>Most Popular Events</h4>
          </div>
          <div className="card-body">
            {popularEvents.length === 0 ? (
              <p>No confirmed bookings yet.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Event Title</th>
                    <th style={{ textAlign: "right" }}>Bookings</th>
                  </tr>
                </thead>
                <tbody>
                  {popularEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.title}</td>
                      <td style={{ textAlign: "right" }}>
                        {event.bookings_count}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h4>📊 Platform Capacity</h4>
          </div>
          <div className="card-body">
            <p
              className="stat-card-title"
              style={{ textAlign: "center", marginBottom: "1rem" }}
            >
              Total Utilization
            </p>
            <h2
              className="stat-card-value"
              style={{ textAlign: "center", color: "var(--primary-color)" }}
            >
              {capacity.utilization_percentage}%
            </h2>
            <hr style={{ margin: "1rem 0" }} />
            <p>
              <strong>Tickets Sold:</strong> {capacity.platform_total_sold}
            </p>
            <p>
              <strong>Total Capacity:</strong>{" "}
              {capacity.platform_total_capacity}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
// === END NEW COMPONENT ===

/**
 * Component for the "Event Requests" tab (Redesigned Layout)
 */
function EventRequestsTab({
  pending = [],
  approved = [],
  rejected = [],
  onReview,
}) {
  const [subTab, setSubTab] = useState("pending");

  let listToDisplay = [];
  if (subTab === "pending") listToDisplay = pending;
  if (subTab === "approved") listToDisplay = approved;
  if (subTab === "rejected") listToDisplay = rejected;

  const truncate = (str, n) => {
    return str?.length > n ? str.substr(0, n - 1) + "..." : str;
  };

  return (
    <div>
      <h3>Event Requests</h3>

      <div
        className="dashboard-tabs"
        style={{ marginTop: "1rem", marginBottom: "1rem" }}
      >
        <button
          className={`tab-btn ${subTab === "pending" ? "active" : ""}`}
          onClick={() => setSubTab("pending")}
        >
          Pending ({pending.length})
        </button>
        <button
          className={`tab-btn ${subTab === "approved" ? "active" : ""}`}
          onClick={() => setSubTab("approved")}
        >
          Approved ({approved.length})
        </button>
        <button
          className={`tab-btn ${subTab === "rejected" ? "active" : ""}`}
          onClick={() => setSubTab("rejected")}
        >
          Rejected ({rejected.length})
        </button>
      </div>

      <div className="tab-content">
        {listToDisplay.length === 0 ? (
          <div className="card card-body" style={{ textAlign: "center" }}>
            <p>No events found in this category. 🎉</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {listToDisplay.map((event) => {
              const defaultImage = getDefaultImage(event.category);
              const imageUrl = event.image_url || defaultImage;

              return (
                <div
                  key={event.id}
                  className="card"
                  style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "flex-start",
                    padding: "0",
                    overflow: "hidden",
                    opacity: subTab === "rejected" ? 0.7 : 1,
                  }}
                >
                  {/* === COLUMN 1: IMAGE === */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: "150px",
                      height: "150px",
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={event.title}
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

                  {/* === COLUMN 2: TITLE & DESCRIPTION === */}
                  <div
                    style={{
                      flexGrow: 1,
                      padding: "1rem 1.25rem",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: "150px",
                      boxSizing: "border-box",
                    }}
                  >
                    <h4 style={{ margin: "0 0 0.25rem 0" }}>{event.title}</h4>
                    <p
                      style={{
                        fontSize: "0.85rem",
                        flexGrow: 1,
                        color: "#333",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {truncate(event.description, 250)}
                    </p>
                  </div>

                  {/* === COLUMN 3: META & ACTIONS === */}
                  <div
                    style={{
                      flexShrink: 0,
                      width: "240px",
                      padding: "1rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      borderLeft: "1px solid var(--border-color)",
                      backgroundColor: "#f8f9fa",
                      minHeight: "150px",
                      boxSizing: "border-box",
                    }}
                  >
                    <div>
                      <p
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                          margin: "0 0 0.5rem 0",
                          fontWeight: "bold",
                        }}
                      >
                        By: {event.organizer_name}
                      </p>
                      <p style={{ fontSize: "0.9rem", margin: 0 }}>
                        <strong>Date:</strong>{" "}
                        {new Date(event.date_time).toLocaleString()}
                      </p>
                      <p
                        style={{ fontSize: "0.9rem", margin: "0.25rem 0 0 0" }}
                      >
                        <strong>Price:</strong> Rs. {event.price} |{" "}
                        <strong>Tickets:</strong> {event.total_tickets}
                      </p>
                      {subTab === "rejected" && event.admin_notes && (
                        <p
                          style={{
                            color: "var(--danger-color)",
                            fontSize: "0.9rem",
                            margin: "10px 0 0",
                            fontWeight: "bold",
                          }}
                        >
                          <strong>Notes:</strong> {event.admin_notes}
                        </p>
                      )}
                    </div>

                    <div>
                      {subTab === "pending" && (
                        <div
                          style={{
                            display: "-ms-flexbox",
                            flexDirection: "column",
                            gap: "0.5rem",
                            marginTop: "1rem",
                          }}
                        >
                          <button
                            className="btn btn-success-outline btn-sm"
                            onClick={() => {
                              const notes = prompt(
                                "Approval notes (optional):"
                              );
                              onReview(event.id, "approve", notes);
                            }}
                          >
                            Approve
                          </button>
                          <button
                            className="btn btn-danger-outline btn-sm"
                            onClick={() => {
                              const notes = prompt("Reason for rejection:");
                              if (notes) onReview(event.id, "reject", notes);
                            }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
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

/**
 * Component for the "Host Applications" tab
 */
function HostApplicationsTab({
  pending = [],
  approved = [],
  rejected = [],
  onReview,
}) {
  const [subTab, setSubTab] = useState("pending");

  let listToDisplay = [];
  if (subTab === "pending") listToDisplay = pending;
  if (subTab === "approved") listToDisplay = approved;
  if (subTab === "rejected") listToDisplay = rejected;

  return (
    <div>
      <h3>Host Applications</h3>

      <div
        className="dashboard-tabs"
        style={{ marginTop: "1rem", marginBottom: "1rem" }}
      >
        <button
          className={`tab-btn ${subTab === "pending" ? "active" : ""}`}
          onClick={() => setSubTab("pending")}
        >
          Pending ({pending.length})
        </button>
        <button
          className={`tab-btn ${subTab === "approved" ? "active" : ""}`}
          onClick={() => setSubTab("approved")}
        >
          Approved ({approved.length})
        </button>
        <button
          className={`tab-btn ${subTab === "rejected" ? "active" : ""}`}
          onClick={() => setSubTab("rejected")}
        >
          Rejected ({rejected.length})
        </button>
      </div>

      <div className="tab-content">
        {listToDisplay.length === 0 ? (
          <div className="card card-body" style={{ textAlign: "center" }}>
            <p>No applications found in this category. 🎉</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {listToDisplay.map((host) => {
              const personal = host.host_verification_data?.personal || {};
              const bank = host.host_verification_data?.bank || {};

              return (
                <div key={host.id} className="card">
                  <div
                    className="card-header"
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div>
                      <h4 style={{ margin: 0 }}>{host.name}</h4>
                      <p style={{ margin: 0, color: "var(--text-muted)" }}>
                        {host.email}
                      </p>
                      <p style={{ margin: "5px 0 0 0", fontSize: "0.9rem" }}>
                        <strong>Applied:</strong>{" "}
                        {new Date(host.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {subTab === "pending" && (
                      <div
                        style={{
                          display: "flex",
                          gap: "0.5rem",
                          flexShrink: 0,
                        }}
                      >
                        <button
                          className="btn btn-success-outline btn-sm"
                          onClick={() => {
                            const notes = prompt("Approval notes (optional):");
                            onReview(host.id, "approve", notes);
                          }}
                        >
                          Approve Host
                        </button>
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => {
                            const notes = prompt("Reason for rejection:");
                            if (notes) onReview(host.id, "reject", notes);
                          }}
                        >
                          Reject Host
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="card-body">
                    <div className="form-grid" style={{ gap: "1rem 1.5rem" }}>
                      <div>
                        <h5 style={{ marginBottom: "0.5rem" }}>👤 Personal</h5>
                        <p>
                          <strong>Phone:</strong> {personal.phone || "N/A"}
                        </p>
                        <p>
                          <strong>ID Type:</strong> {personal.idType || "N/A"}
                        </p>
                        <p>
                          <strong>ID Number:</strong>{" "}
                          {personal.idNumber || "N/A"}
                        </p>
                      </div>
                      <div>
                        <h5 style={{ marginBottom: "0.5rem" }}>🏦 Bank</h5>
                        <p>
                          <strong>Holder:</strong>{" "}
                          {bank.account_holder_name || "N/A"}
                        </p>
                        <p>
                          <strong>Bank:</strong> {bank.bank_name || "N/A"}
                        </p>
                        <p>
                          <strong>Account No:</strong>{" "}
                          {bank.account_number || "N/A"}
                        </p>
                      </div>
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

function AdminPanel({
  pendingEvents,
  allApprovedEvents,
  allRejectedEvents,
  onReviewEvent,
  pendingHosts,
  approvedHosts,
  rejectedHosts,
  onReviewHost,
  adminPayouts,
  onRefreshPayouts,
  onShowPayoutModal,
  getPayoutStatusColor,
  getPayoutStatusText,
  onShowEventForm,
  myCreatedEvents,
  onViewBookings,
  onEditEvent,
  onViewDetail,
  onCancelEvent,
  analytics, // <-- 1. ADD NEW PROP
}) {
  const [activeTab, setActiveTab] = useState("dashboard"); // <-- 2. CHANGE DEFAULT

  return (
    <div className="admin-panel">
      <h2>Admin Panel</h2>

      {/* --- Tab Header --- */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-color)",
          marginBottom: "1.5rem",
        }}
      >
        <div
          className="dashboard-tabs"
          style={{
            flexGrow: 1,
            borderBottom: "none",
            marginBottom: 0,
          }}
        >
          {/* 3. ADD NEW TAB BUTTON */}
          <button
            className={`tab-btn ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => setActiveTab("dashboard")}
          >
            Dashboard
          </button>
          <button
            className={`tab-btn ${activeTab === "hosts" ? "active" : ""}`}
            onClick={() => setActiveTab("hosts")}
          >
            Host Applications
          </button>
          <button
            className={`tab-btn ${activeTab === "payouts" ? "active" : ""}`}
            onClick={() => setActiveTab("payouts")}
          >
            All Payouts
          </button>
          <button
            className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
            onClick={() => setActiveTab("events")}
          >
            Event Requests
          </button>
          <button
            className={`tab-btn ${activeTab === "myEvents" ? "active" : ""}`}
            onClick={() => setActiveTab("myEvents")}
          >
            Hosted Events
          </button>
        </div>

        <button
          className="btn btn-success"
          onClick={onShowEventForm}
          style={{ marginLeft: "1rem" }}
        >
          Create Event
        </button>
      </div>

      {/* --- Tab Content --- */}
      <div className="tab-content">
        {/* 4. ADD NEW TAB CONTENT */}
        {activeTab === "dashboard" && (
          <AnalyticsDashboardTab analytics={analytics} />
        )}

        {activeTab === "events" && (
          <EventRequestsTab
            pending={pendingEvents}
            approved={allApprovedEvents}
            rejected={allRejectedEvents}
            onReview={onReviewEvent}
          />
        )}

        {activeTab === "hosts" && (
          <HostApplicationsTab
            pending={pendingHosts}
            approved={approvedHosts}
            rejected={rejectedHosts}
            onReview={onReviewHost}
          />
        )}

        {activeTab === "payouts" && (
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <h3>All Payouts</h3>
              <div>
                <button
                  className="btn btn-primary"
                  onClick={onShowPayoutModal}
                  style={{ marginRight: "10px" }}
                >
                  Create Payout
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={onRefreshPayouts}
                >
                  Refresh Payouts
                </button>
              </div>
            </div>
            {adminPayouts.length === 0 ? (
              <div className="card card-body" style={{ textAlign: "center" }}>
                <p>No payouts found.</p>
              </div>
            ) : (
              <div
                className="payout-list"
                style={{ display: "flex", flexDirection: "column" }}
              >
                {adminPayouts.map((payout) => {
                  const defaultImage = getDefaultImage(payout.category);
                  const imageUrl = payout.image_url || defaultImage;

                  return (
                    <div
                      key={payout.id}
                      className="card"
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "stretch",
                        padding: "0",
                        overflow: "hidden",
                      }}
                    >
                      <div style={{ flexShrink: 0, width: "150px" }}>
                        <img
                          src={imageUrl}
                          alt={payout.event_title || "Event"}
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
                      <div
                        style={{
                          flexGrow: 1,
                          padding: "1rem 1.25rem",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 0.25rem 0",
                            fontSize: "1.5rem",
                            color: "var(--success-color)",
                          }}
                        >
                          Rs. {payout.amount}
                        </h4>
                        <p
                          style={{
                            fontSize: "1rem",
                            fontWeight: "600",
                            margin: "0 0 0.5rem 0",
                          }}
                        >
                          Event: {payout.event_title || "N/A"}
                        </p>
                        <p
                          style={{
                            fontSize: "0.9rem",
                            color: "var(--text-muted)",
                            margin: 0,
                            flexGrow: 1,
                          }}
                        >
                          <strong>Host:</strong> {payout.host_name || "N/A"} (
                          {payout.host_email})
                        </p>
                        <p
                          style={{
                            fontSize: "0.9rem",
                            color: "var(--text-muted)",
                            margin: 0,
                          }}
                        >
                          <strong>Created:</strong>{" "}
                          {new Date(payout.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div
                        style={{
                          flexShrink: 0,
                          width: "180px",
                          padding: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          alignItems: "flex-end",
                          borderLeft: "1px solid var(--border-color)",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        <span
                          className={`badge ${getPayoutStatusColor(
                            payout.status
                          )}`}
                        >
                          {getPayoutStatusText(payout.status)}
                        </span>

                        {payout.processed_at && (
                          <p
                            style={{
                              fontSize: "0.8rem",
                              margin: "5px 0 0 0",
                              textAlign: "right",
                            }}
                          >
                            Processed:{" "}
                            {new Date(payout.processed_at).toLocaleDateString()}
                          </p>
                        )}

                        {payout.failure_reason && (
                          <p
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--danger-color)",
                              textAlign: "right",
                              marginTop: "auto",
                            }}
                          >
                            <strong>Failed:</strong> {payout.failure_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* === HOSTED EVENTS TAB (FOR ADMIN'S OWN EVENTS) === */}
        {activeTab === "myEvents" && (
          <div>
            <h3>Hosted Events</h3>
            {myCreatedEvents.length === 0 ? (
              <div className="card card-body" style={{ textAlign: "center" }}>
                <p>You have not created any events yet.</p>
              </div>
            ) : (
              <div
                className="my-events-list"
                style={{ display: "flex", flexDirection: "column" }}
              >
                {myCreatedEvents.map((event) => {
                  const isEventInPast = new Date(event.date_time) < new Date();
                  const defaultImage = getDefaultImage(event.category);
                  const imageUrl = event.image_url || defaultImage;

                  // === NEW LOGIC ===
                  const isLocked = isEventInPast || event.is_cancelled;

                  return (
                    <div
                      key={event.id}
                      className="card"
                      style={{
                        display: "flex",
                        flexDirection: "row",
                        alignItems: "stretch",
                        padding: "0",
                        overflow: "hidden",
                        opacity: isLocked ? 0.7 : 1,
                      }}
                    >
                      <div style={{ flexShrink: 0, width: "150px" }}>
                        <img
                          src={imageUrl}
                          alt={event.title}
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
                      <div
                        style={{
                          flexGrow: 1,
                          padding: "1rem 1.25rem",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <h4
                          style={{
                            margin: "0 0 0.25rem 0",
                            fontSize: "1.25rem",
                          }}
                        >
                          <button
                            className="btn-link"
                            onClick={() => onViewDetail(event.id)}
                            style={{
                              fontSize: "1.25rem",
                              padding: 0,
                              textAlign: "left",
                              fontWeight: "bold",
                            }}
                          >
                            {event.title}
                          </button>
                        </h4>
                        <p
                          style={{
                            fontSize: "0.9rem",
                            color: "var(--text-muted)",
                            margin: "0.25rem 0 1rem 0",
                          }}
                        >
                          {new Date(event.date_time).toLocaleString()}
                        </p>
                        <div style={{ flexGrow: 1 }}>
                          <span
                            className="badge badge-info"
                            style={{ marginRight: "10px" }}
                          >
                            Sold: {event.tickets_sold} / {event.total_tickets}
                          </span>

                          <span className="badge badge-success">
                            Status: {event.approval_status}
                          </span>

                          {event.is_cancelled && (
                            <span
                              className="badge badge-danger"
                              style={{ marginLeft: "10px" }}
                            >
                              CANCELLED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* === UPDATED ACTION COLUMN === */}
                      <div
                        style={{
                          flexShrink: 0,
                          width: "160px",
                          padding: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "stretch",
                          gap: "0.5rem",
                          borderLeft: "1px solid var(--border-color)",
                          backgroundColor: "#f8f9fa",
                        }}
                      >
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => onViewBookings(event)}
                        >
                          {event.is_cancelled ? "View Status" : "View Bookings"}
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => onEditEvent(event)}
                          disabled={isLocked}
                          title={
                            isLocked
                              ? "Cannot edit past or cancelled events"
                              : "Edit event"
                          }
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-danger-outline btn-sm"
                          onClick={() => onCancelEvent(event.id)}
                          disabled={isLocked}
                          title={
                            isLocked
                              ? "Event cannot be cancelled"
                              : "Cancel event and refund all bookings"
                          }
                        >
                          Cancel Event
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

AdminPanel.defaultProps = {
  pendingEvents: [],
  allApprovedEvents: [],
  allRejectedEvents: [],
  pendingHosts: [],
  approvedHosts: [],
  rejectedHosts: [],
  adminPayouts: [],
  myCreatedEvents: [],
};

export default AdminPanel;
