function HealthCheckFooter({ health, onRefresh }) {
  const isHealthy = health?.message === "✅ Backend API is healthy!";

  return (
    <footer className="health-check-footer">
      <p>
        API Status:{" "}
        {health ? (
          <span className={isHealthy ? "success" : "error"}>
            {health.message}
          </span>
        ) : (
          <span className="error">Connecting...</span>
        )}
      </p>
      {health && (
        <p>
          Database:{" "}
          <span
            className={health.database === "Connected" ? "success" : "error"}
          >
            {health.database || "N/A"}
          </span>
        </p>
      )}
      <button
        className="btn-link"
        onClick={onRefresh}
        style={{ marginLeft: "1rem", color: "#999" }}
      >
        Test Connection
      </button>
    </footer>
  );
}

export default HealthCheckFooter;
