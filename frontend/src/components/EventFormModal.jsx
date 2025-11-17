import LocationAutocomplete from "./LocationAutocomplete";

function EventFormModal({
  onClose,
  onSubmit,
  formData,
  onInputChange,
  categories,
  user,
  bankAccount,
  eventToEdit,
}) {
  const isEditMode = !!eventToEdit;
  const modalTitle = isEditMode ? "Edit Event" : "Create New Event";
  const submitText = isEditMode ? "Save Changes" : "Create Event";
  const isPaidEvent = parseFloat(formData.price) > 0;
  const canCreatePaidEvent =
    user?.role === "admin" || (bankAccount && bankAccount.is_verified);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{modalTitle}</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>
        <form onSubmit={onSubmit}>
          <div className="modal-body">
            {user?.role !== "admin" && (
              <div className="info-box info-box-warning">
                ⚠️ Your events will require admin approval before being
                published.
              </div>
            )}

            <div className="form-grid">
              <div className="form-group">
                <label>Event Title *</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={onInputChange}
                  className="form-control"
                  required
                />
              </div>
              <div className="form-group">
                <label>Date & Time *</label>
                <input
                  type="datetime-local"
                  name="date_time"
                  value={formData.date_time}
                  onChange={onInputChange}
                  className="form-control"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label>Venue / Address</label>
              <LocationAutocomplete
                initialValue={formData.venue}
                onSelect={(venueString) => {
                  onInputChange({
                    target: {
                      name: "venue",
                      value: venueString,
                    },
                  });
                }}
                placeholder="Start typing the event's address..."
              />
              <small
                style={{
                  display: "block",
                  marginTop: "5px",
                  color: "var(--text-muted)",
                }}
              >
                Please select a valid address from the list.
              </small>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>Total Tickets *</label>
                <input
                  type="number"
                  name="total_tickets"
                  value={formData.total_tickets}
                  onChange={onInputChange}
                  className="form-control"
                  required
                  min="1"
                />
              </div>
              <div className="form-group">
                <label>Price (Rs.) *</label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={onInputChange}
                  className="form-control"
                  required
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            {isPaidEvent && !canCreatePaidEvent && (
              <div className="info-box info-box-danger">
                Your bank account must be verified to create paid events. You
                can create a free event (price $0) for now.
              </div>
            )}

            <div className="form-group">
              <label>Category *</label>
              <select
                name="category"
                value={formData.category}
                onChange={onInputChange}
                className="form-control"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Image URL</label>
              <input
                type="url"
                name="image_url"
                value={formData.image_url}
                onChange={onInputChange}
                className="form-control"
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={onInputChange}
                className="form-control"
                rows="3"
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
            <button type="submit" className="btn btn-primary">
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default EventFormModal;
