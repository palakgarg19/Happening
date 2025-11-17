function Header({
  user,
  activeTab,
  onNavigate,
  onLoginClick,
  onLogout,
  hostStatus,
}) {
  const isAdmin = user?.role === "admin";
  const isApprovedHost = hostStatus?.host_status === "approved";

  return (
    <header className="app-header">
      <div className="container">
        <div className="header-left">
          <a
            href="#events"
            className="header-logo"
            onClick={() => onNavigate("events")}
          >
            Happening
          </a>
          <nav className="header-nav">
            <button
              className={`nav-link ${activeTab === "events" ? "active" : ""}`}
              onClick={() => onNavigate("events")}
            >
              Events
            </button>
            {user && (
              <button
                className={`nav-link ${
                  activeTab === "bookings" ? "active" : ""
                }`}
                onClick={() => onNavigate("bookings")}
              >
                My Bookings
              </button>
            )}
            {user && !isAdmin && (
              <button
                className={`nav-link ${activeTab === "host" ? "active" : ""}`}
                onClick={() => onNavigate("host")}
              >
                Host Dashboard
              </button>
            )}
            {user && isAdmin && (
              <button
                className={`nav-link ${activeTab === "admin" ? "active" : ""}`}
                onClick={() => onNavigate("admin")}
              >
                Admin Panel
              </button>
            )}
          </nav>
        </div>

        <div className="header-right">
          {user ? (
            <div className="user-menu">
              <span className="user-name-display">{user.name}</span>
              {(isAdmin || isApprovedHost) && (
                <span className="role-tag">({isAdmin ? "Admin" : "Host"})</span>
              )}
              <button className="btn btn-secondary" onClick={onLogout}>
                Logout
              </button>
            </div>
          ) : (
            <button className="btn btn-primary" onClick={onLoginClick}>
              Login / Register
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
