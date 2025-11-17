function HostApplicationModal({
  onClose,
  onApplyAsHost,
  hostApplicationData,
  onHostInputChange,
}) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: "700px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Host Application Form</h3>
          <button className="close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        {/* We use the 'onSubmit' prop here, which points to onApplyAsHost */}
        <form onSubmit={onApplyAsHost}>
          <div
            className="modal-body"
            style={{ maxHeight: "70vh", overflowY: "auto" }}
          >
            {/* === PERSONAL SECTION === */}
            <div style={{ marginBottom: "1.5rem" }}>
              <h4>👤 Personal & Verification Details</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    type="tel"
                    name="phone"
                    value={hostApplicationData.phone}
                    onChange={onHostInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>ID Type *</label>
                  <select
                    name="idType"
                    value={hostApplicationData.idType}
                    onChange={onHostInputChange}
                    className="form-control"
                    required
                  >
                    <option value="driver_license">Driver's License</option>
                    <option value="passport">Passport</option>
                    <option value="national_id">National ID</option>
                    <option value="business_license">Business License</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>ID Number *</label>
                  <input
                    type="text"
                    name="idNumber"
                    value={hostApplicationData.idNumber}
                    onChange={onHostInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Organization (Optional)</label>
                  <input
                    type="text"
                    name="organization"
                    value={hostApplicationData.organization}
                    onChange={onHostInputChange}
                    className="form-control"
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Bio (Optional)</label>
                <textarea
                  name="bio"
                  value={hostApplicationData.bio}
                  onChange={onHostInputChange}
                  className="form-control"
                  rows="3"
                  placeholder="Tell us a bit about yourself or your organization"
                ></textarea>
              </div>
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Experience (Optional)</label>
                <textarea
                  name="experience"
                  value={hostApplicationData.experience}
                  onChange={onHostInputChange}
                  className="form-control"
                  rows="3"
                  placeholder="Describe your experience in hosting events"
                ></textarea>
              </div>
            </div>

            {/* === BANK SECTION === */}
            <div>
              <h4>🏦 Bank Account Details (For Receiving Payments)</h4>
              <div className="form-grid">
                <div className="form-group">
                  <label>Account Holder Name *</label>
                  <input
                    type="text"
                    name="account_holder_name"
                    value={hostApplicationData.account_holder_name}
                    onChange={onHostInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Account Number *</label>
                  <input
                    type="text"
                    name="account_number"
                    value={hostApplicationData.account_number}
                    onChange={onHostInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>IFSC Code *</label>
                  <input
                    type="text"
                    name="ifsc_code"
                    value={hostApplicationData.ifsc_code}
                    onChange={onHostInputChange}
                    className="form-control"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Bank Name *</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={hostApplicationData.bank_name}
                    onChange={onHostInputChange}
                    className="form-control"
                    required
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: "1rem" }}>
                <label>Account Type</label>
                <select
                  name="account_type"
                  value={hostApplicationData.account_type}
                  onChange={onHostInputChange}
                  className="form-control"
                >
                  <option value="savings">Savings Account</option>
                  <option value="current">Current Account</option>
                </select>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Submit Application
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{ marginLeft: "0.5rem" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default HostApplicationModal;
