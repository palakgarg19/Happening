# --- Stage 1: Build the React App ---
FROM node:18-slim AS build

# Set working directory
WORKDIR /app

# Copy package.json and lock file
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy all frontend source code
COPY . .

# Build the static files
# This runs 'npm run build' as defined in your package.json
RUN npm run build

# --- Stage 2: Serve with Nginx ---
# Use the official, lightweight Nginx image
FROM nginx:1.25-alpine

# Copy the static files from the 'build' stage (from the /app/dist folder)
# into the Nginx public HTML directory
COPY --from=build /app/dist /usr/share/nginx/html

# Expose the default Nginx port
EXPOSE 80

# The default Nginx command will run automatically
CMD ["nginx", "-g", "daemon off;"]