## Happening - React Frontend

This directory contains the source code for the "Happening" user interface. It's a modern, responsive single-page application (SPA) built with React and Vite.

This application is the "client" half of the project and is designed to consume the API provided by the backend/ service.

### 🛠 Tech Stack

- Framework: React 18+

- Build Tool: Vite

- Language: JavaScript (ES6+)

- HTTP Client: Axios (for communicating with the backend API)

- Styling: Plain CSS (App.css)

### 🚀 Run Locally

**1. Prerequisites**

Before you can run the frontend, you must have the backend API and worker services running.

Start the Redis and RabbitMQ services.

  In a terminal, run the backend API:
  
  ```bash
  cd ../backend
  npm run dev
  ```

  In a second terminal, run the backend worker:
  
  ```bash
  cd ../backend
  node worker.js
  ```

The frontend will try to connect to the API at http://localhost:5000/api.

**2. Install & Run**

In a third terminal, run the frontend:

# From the /happening/frontend directory

```bash
npm install
npm run dev
```

✅ Your React application should now be running on http://localhost:5173.
