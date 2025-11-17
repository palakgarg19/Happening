function PayoutModal({
  onClose,
  onSubmit,
  payoutFormData,
  setPayoutFormData,
  payableEvents,
}) {
  const handleEventSelect = (e) => {
    const eventId = e.target.value;
    if (!eventId) {
      setPayoutFormData({
        event_id: "",
        host_id: "",
        amount: "",
        notes: "",
      });
      return;
    }
    const selectedEvent = payableEvents.find((e) => e.id === eventId);

    if (selectedEvent) {
      const totalRevenue = parseFloat(selectedEvent.total_revenue);
      const platformFee = totalRevenue * 0.1; // 10% platform fee
      const hostPayout = totalRevenue - platformFee;

      setPayoutFormData((prev) => ({
        ...prev,
        event_id: selectedEvent.id,
        host_id: selectedEvent.host_id,
        amount: hostPayout.toFixed(2),
        notes: `Payout for "${
          selectedEvent.event_title
        }". Total Revenue: $${totalRevenue.toFixed(
          2
        )}, Platform Fee: $${platformFee.toFixed(2)}`,
      }));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "500px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Create Payout</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label>Select Event to Pay *</label>
              <select
                className="form-control"
                value={payoutFormData.event_id}
                onChange={handleEventSelect}
                required
              >
                <option value="">
                  -- Choose an event ({payableEvents.length} pending) --
                </option>
                {payableEvents.map((event) => (
                  <option key={event.id} value={event.id}>
                    "{event.event_title}" (Host: {event.host_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Host ID</label>
              <input
                type="text"
                className="form-control"
                value={payoutFormData.host_id}
                readOnly
                style={{ backgroundColor: "#f8f9fa", opacity: 0.7 }}
              />
            </div>

            <div className="form-group">
              <label>Payout Amount (auto-calculated)</label>
              <input
                type="number"
                className="form-control"
                value={payoutFormData.amount}
                onChange={(e) =>
                  setPayoutFormData((prev) => ({
                    ...prev,
                    amount: e.target.value,
                  }))
                }
                required
              />
            </div>

            <div className="form-group">
              <label>Notes</label>
              <textarea
                className="form-control"
                value={payoutFormData.notes}
                onChange={(e) =>
                  setPayoutFormData((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
              />
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-success">
              Process Payout
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PayoutModal;
