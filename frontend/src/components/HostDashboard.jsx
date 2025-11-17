import { useState, useMemo } from "react";
import { getDefaultImage } from '../utils.js';

function HostDashboard({
  hostStatus,
  bankAccount,
  payouts,
  onRefreshPayouts,
  onShowHostModal,
  showBankAccountForm,
  setShowBankAccountForm,
  bankAccountData,
  setBankAccountData,
  onAddBankAccount,
  getPayoutStatusColor,
  getPayoutStatusText,
  onShowEventForm,
  myCreatedEvents,
  onViewBookings,
  onEditEvent,
  onViewDetail,
  onCancelEvent,
}) {
  const isApprovedHost = hostStatus?.host_status === "approved";
  const [activeTab, setActiveTab] = useState("myEvents");

  const categorizedEvents = useMemo(() => {
    return myCreatedEvents.reduce(
      (acc, event) => {
        if (event.approval_status === "approved") {
          acc.approved.push(event);
        } else if (event.approval_status === "pending") {
          acc.pending.push(event);
        } else if (event.approval_status === "rejected") {
          acc.rejected.push(event);
        }
        return acc;
      },
      { approved: [], pending: [], rejected: [] }
    );
  }, [myCreatedEvents]);

  const [eventSubTab, setEventSubTab] = useState("approved");

  let listToDisplay = [];
  if (eventSubTab === "approved") listToDisplay = categorizedEvents.approved;
  if (eventSubTab === "pending") listToDisplay = categorizedEvents.pending;
  if (eventSubTab === "rejected") listToDisplay = categorizedEvents.rejected;

  // --- Bank Account Form JSX ---
  const bankAccountForm = (
    <div className="card" style={{ marginTop: "2rem", marginBottom: "2rem" }}>
      <div className="card-header">
        <h3>🏦 Add Bank Account Details</h3>
      </div>
      <form onSubmit={onAddBankAccount}>
        <div className="card-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Account Holder Name *</label>
              <input
                type="text"
                value={bankAccountData.account_holder_name}
                onChange={(e) =>
                  setBankAccountData((prev) => ({
                    ...prev,
                    account_holder_name: e.target.value,
                  }))
                }
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Account Number *</label>
              <input
                type="text"
                value={bankAccountData.account_number}
                onChange={(e) =>
                  setBankAccountData((prev) => ({
                    ...prev,
                    account_number: e.target.value,
                  }))
                }
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>IFSC Code *</label>
              <input
                type="text"
                value={bankAccountData.ifsc_code}
                onChange={(e) =>
                  setBankAccountData((prev) => ({
                    ...prev,
                    ifsc_code: e.target.value.toUpperCase(),
                  }))
                }
                className="form-control"
                required
              />
            </div>
            <div className="form-group">
              <label>Bank Name *</label>
              <input
                type="text"
                value={bankAccountData.bank_name}
                onChange={(e) =>
                  setBankAccountData((prev) => ({
                    ...prev,
                    bank_name: e.target.value,
                  }))
                }
                className="form-control"
                required
              />
            </div>
          </div>
          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Account Type</label>
            <select
              value={bankAccountData.account_type}
              onChange={(e) =>
                setBankAccountData((prev) => ({
                  ...prev,
                  account_type: e.target.value,
                }))
              }
              className="form-control"
            >
              <option value="savings">Savings Account</option>
              <option value="current">Current Account</option>
            </select>
          </div>
          <div className="info-box" style={{ marginTop: "1rem" }}>
            🔒 Your bank details are stored securely.
          </div>
        </div>
        <div className="card-footer">
          <button type="submit" className="btn btn-success">
            Save Bank Details
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowBankAccountForm(false)}
            style={{ marginLeft: "0.5rem" }}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );

  // --- Host Dashboard Render ---
  return (
    <div className="host-dashboard">
      <h2>Host Dashboard</h2>

      {/* --- Host Status / Application (This logic is for NON-APPROVED hosts) --- */}
      {!isApprovedHost && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <div className="card-header">
            <h3>Become an Event Host</h3>
          </div>
          <div className="card-body">
            {hostStatus?.host_status === "pending" ? (
              <div className="info-box info-box-warning">
                <p>
                  ✅ Your host application is under review. We'll get back to
                  you within 24 hours.
                </p>
              </div>
            ) : hostStatus?.host_status === "rejected" ? (
              <div className="info-box info-box-danger">
                <h4>❌ Application Not Approved</h4>
                <p>Your host application was not approved at this time.</p>
                {hostStatus?.host_verification_data?.adminNotes && (
                  <p>
                    <strong>Admin Feedback:</strong>{" "}
                    {hostStatus.host_verification_data.adminNotes}
                  </p>
                )}
                <button
                  className="btn btn-danger"
                  style={{ marginTop: "1rem" }}
                  onClick={onShowHostModal}
                >
                  Reapply as Host
                </button>
              </div>
            ) : (
              <div>
                <p>
                  Want to organize your own events? Apply to become a verified
                  host!
                </p>
                <button className="btn btn-info" onClick={onShowHostModal}>
                  Apply as Host
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Approved Host View (This logic is for APPROVED hosts) --- */}
      {isApprovedHost && (
        <>
          {/* --- Main Tab Header --- */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderBottom: "1px solid var(--border-color)",
              marginBottom: "1.5rem",
              marginTop: "1rem",
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
              <button
                className={`tab-btn ${
                  activeTab === "myEvents" ? "active" : ""
                }`}
                onClick={() => setActiveTab("myEvents")}
              >
                Event Management
              </button>
              <button
                className={`tab-btn ${activeTab === "payouts" ? "active" : ""}`}
                onClick={() => setActiveTab("payouts")}
              >
                My Payouts ({payouts.length})
              </button>
              <button
                className={`tab-btn ${activeTab === "bank" ? "active" : ""}`}
                onClick={() => setActiveTab("bank")}
              >
                Bank Details
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

          {/* --- Main Tab Content --- */}
          <div className="tab-content">
            {/* === EVENT MANAGEMENT TAB === */}
            {activeTab === "myEvents" && (
              <div>
                <div
                  className="dashboard-tabs"
                  style={{ marginTop: "1rem", marginBottom: "1rem" }}
                >
                  <button
                    className={`tab-btn ${
                      eventSubTab === "approved" ? "active" : ""
                    }`}
                    onClick={() => setEventSubTab("approved")}
                  >
                    Approved ({categorizedEvents.approved.length})
                  </button>
                  <button
                    className={`tab-btn ${
                      eventSubTab === "pending" ? "active" : ""
                    }`}
                    onClick={() => setEventSubTab("pending")}
                  >
                    Pending ({categorizedEvents.pending.length})
                  </button>
                  <button
                    className={`tab-btn ${
                      eventSubTab === "rejected" ? "active" : ""
                    }`}
                    onClick={() => setEventSubTab("rejected")}
                  >
                    Rejected ({categorizedEvents.rejected.length})
                  </button>
                </div>

                <div className="tab-content">
                  {listToDisplay.length === 0 ? (
                    <div
                      className="card card-body"
                      style={{ textAlign: "center" }}
                    >
                      <p>No events found in this category.</p>
                    </div>
                  ) : (
                    <div
                      className="my-events-list"
                      style={{ display: "flex", flexDirection: "column" }}
                    >
                      {listToDisplay.map((event) => {
                        const isEventInPast =
                          new Date(event.date_time) < new Date();
                        const defaultImage = getDefaultImage(event.category);
                        const imageUrl = event.image_url || defaultImage;

                        // === NEW LOGIC ===
                        const isLocked =
                          isEventInPast ||
                          event.is_cancelled ||
                          event.approval_status === "rejected";

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
                                  Sold: {event.tickets_sold} /{" "}
                                  {event.total_tickets}
                                </span>
                                <span
                                  className={`badge ${
                                    event.approval_status === "approved"
                                      ? "badge-success"
                                      : event.approval_status === "pending"
                                      ? "badge-warning"
                                      : "badge-danger"
                                  }`}
                                >
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
                                {event.approval_status === "rejected" &&
                                  event.admin_notes && (
                                    <p
                                      style={{
                                        color: "var(--danger-color)",
                                        fontSize: "0.8rem",
                                        margin: "5px 0 0",
                                      }}
                                    >
                                      <strong>Admin Notes:</strong>{" "}
                                      {event.admin_notes}
                                    </p>
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
                                {event.is_cancelled
                                  ? "View Status"
                                  : "View Bookings"}
                              </button>
                              <button
                                className="btn btn-secondary btn-sm"
                                onClick={() => onEditEvent(event)}
                                disabled={isLocked}
                                title={
                                  isEventInPast
                                    ? "Cannot edit past events"
                                    : event.is_cancelled
                                    ? "Cannot edit a cancelled event"
                                    : event.approval_status === "rejected"
                                    ? "Cannot edit a rejected event"
                                    : "Edit event"
                                }
                              >
                                Edit
                              </button>

                              <button
                                className="btn btn-danger-outline btn-sm"
                                onClick={() => onCancelEvent(event.id)}
                                disabled={
                                  isEventInPast ||
                                  event.is_cancelled ||
                                  event.approval_status !== "approved"
                                }
                                title={
                                  isEventInPast
                                    ? "Cannot cancel past events"
                                    : event.is_cancelled
                                    ? "Event is already cancelled"
                                    : event.approval_status !== "approved"
                                    ? "Can only cancel an approved event"
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
              </div>
            )}

            {/* === BANK DETAILS TAB (NEW UI) === */}
            {activeTab === "bank" && (
              <div>
                <div className="card bank-details-card">
                  {" "}
                  {/* <-- Added new class */}
                  <div className="card-header">
                    <h3>Bank Account Details</h3>
                  </div>
                  <div className="card-body">
                    {bankAccount ? (
                      <div>
                        {/* === NEW GRID LAYOUT === */}
                        <div className="bank-details-grid">
                          <div className="bank-details-item">
                            <strong>Account Holder:</strong>
                            <span>{bankAccount.account_holder_name}</span>
                          </div>
                          <div className="bank-details-item">
                            <strong>Account Number:</strong>
                            <span>{bankAccount.account_number}</span>
                          </div>
                          <div className="bank-details-item">
                            <strong>Bank:</strong>
                            <span>{bankAccount.bank_name}</span>
                          </div>
                          <div className="bank-details-item">
                            <strong>IFSC:</strong>
                            <span>{bankAccount.ifsc_code}</span>
                          </div>
                        </div>
                        <span
                          className={`badge ${
                            bankAccount.is_payout_eligible
                              ? "badge-success"
                              : "badge-warning"
                          }`}
                          style={{ marginTop: "1.5rem" }} // <-- Added margin
                        >
                          {bankAccount.is_payout_eligible
                            ? "✅ Payout Eligible"
                            : "⏳ Pending Verification"}
                        </span>
                      </div>
                    ) : (
                      // "Add Bank Account" view (no change)
                      <div>
                        <p>
                          To receive payments for your events, please add your
                          bank account details.
                        </p>
                        <button
                          className="btn btn-primary"
                          onClick={() => setShowBankAccountForm(true)}
                        >
                          Add Bank Account
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {showBankAccountForm && bankAccountForm}
              </div>
            )}

            {/* === MY PAYOUTS TAB === */}
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
                  <h3>My Payouts</h3>
                  <button
                    className="btn btn-secondary"
                    onClick={onRefreshPayouts}
                  >
                    Refresh Payouts
                  </button>
                </div>
                {payouts.length === 0 ? (
                  <div
                    className="card card-body"
                    style={{ textAlign: "center" }}
                  >
                    <p>No payouts found.</p>
                  </div>
                ) : (
                  <div
                    className="payout-list"
                    style={{ display: "flex", flexDirection: "column" }}
                  >
                    {payouts.map((payout) => {
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
                                margin: "0 0 1rem 0",
                              }}
                            >
                              For Event: {payout.event_title || "N/A"}
                            </p>
                            <p
                              style={{
                                fontSize: "0.9rem",
                                color: "var(--text-muted)",
                                margin: 0,
                                flexGrow: 1,
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
                                {new Date(
                                  payout.processed_at
                                ).toLocaleDateString()}
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
          </div>
        </>
      )}
    </div>
  );
}

export default HostDashboard;
