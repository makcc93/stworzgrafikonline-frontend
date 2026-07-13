# Development Docker Setup

## Quick Start (Development Mode)

### Option 1: Using Docker Compose (Recommended)

```bash
# Run in development mode with login capabilities
docker-compose -f docker-compose.dev.yml up
```

Then visit: http://localhost:8080

### Option 2: Using Docker Build

```bash
# Build development image
docker build -f Dockerfile.dev -t frontend:dev .

# Run development container
docker run -p 8080:8080 frontend:dev
```

Then visit: http://localhost:8080

## Demo Login Credentials

- **Login:** `admin`
- **Password:** `admin`

## Development vs Production

### Development (`Dockerfile.dev`)
- Runs `npm run dev` 
- Includes Express server with API endpoints
- Login functionality available
- Hot reload enabled
- Port: 8080

### Production (`Dockerfile`)
- Runs `npm run build` then serves with nginx
- Static files only
- No login functionality (static build)
- Optimized for deployment
- Port: 80

## Environment Variables

### Development
- `NODE_ENV=development` (set automatically)
- Enables API endpoints
- Enables mock authentication

### Production
- `NODE_ENV=production` (set automatically)
- Static build only
- No API endpoints

## Troubleshooting

### Can't login?
1. Make sure you're using the development Docker setup
2. Check that port 8080 is accessible
3. Use credentials: admin / admin
4. Check browser console for errors

### Build issues?
1. Make sure you're using `Dockerfile.dev` for development
2. Use `docker-compose.dev.yml` for easier setup
3. Check that all files are copied correctly

## API Endpoints (Development Only)

- `POST /api/auth/login` - Login with login/password
- `POST /api/auth/register` - Register new store
- `GET /api/ping` - Health check
- `GET /api/demo` - Demo endpoint

## File Structure

```
├── Dockerfile          # Production build
├── Dockerfile.dev      # Development server
├── docker-compose.dev.yml  # Development compose
└── DEV_SETUP.md       # This file
```
