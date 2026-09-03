# ITSM Platform

A full-stack IT Service Management (ITSM) application for managing IT tickets, users, teams, approvals, notifications, SLA tracking, and audit logs.

The application has different roles such as Employee, Agent, Manager, and Admin. Each role has different permissions.

---

## Features

* User registration and login
* JWT based authentication
* Role-based access control
* Create and manage tickets
* Assign tickets to teams and agents
* Change ticket status
* Ticket comments
* Internal comments
* File attachments
* Ticket history
* SLA tracking
* Service request approvals
* In-app notifications
* Background notification jobs
* Dashboard and reports
* User management
* Team management
* Category management
* Audit logs
* Change password functionality

---

## Technology Stack

### Frontend

* React 18
* TypeScript
* Vite
* React Router
* Axios
* Recharts
* React Hot Toast
* Lucide React
* date-fns

### Backend

* Node.js
* Express
* TypeScript
* PostgreSQL
* JWT
* bcrypt
* Multer

### Background Jobs

* Redis
* BullMQ
* ioredis

### API Documentation

* Swagger
* OpenAPI 3.0

### Testing

* Jest
* Supertest
* Vitest
* React Testing Library

### Other Tools

* Docker
* Docker Compose
* Helmet
* Express Rate Limit
* Express Validator
* Morgan

---

## Architecture

The project has a React frontend, Node.js backend, PostgreSQL database, and Redis with BullMQ for background jobs.

```text
                   User
                    |
                    v
          +-------------------+
          |  React Frontend   |
          |  TypeScript/Vite  |
          +---------+---------+
                    |
                 REST API
                    |
                    v
          +-------------------+
          | Node.js + Express |
          |     Backend       |
          +----+----------+---+
               |          |
               |          |
               v          v
        +----------+   +----------------+
        |PostgreSQL|   | Redis + BullMQ |
        | Database |   | Background Jobs|
        +----------+   +-------+--------+
                                |
                                v
                         Notification Worker
```

The frontend communicates with the backend using REST APIs.

The backend handles authentication, authorization, tickets, approvals, users, teams, SLA calculations, and audit logs.

Redis and BullMQ are used to process notification jobs in the background.

---

## Database / ER Design

The application uses PostgreSQL.

Main tables are:

* `users`
* `teams`
* `categories`
* `tickets`
* `ticket_comments`
* `ticket_attachments`
* `ticket_history`
* `service_requests`
* `approvals`
* `notifications`
* `audit_logs`

### Main Relationships

```text
Teams
  |
  +---- Users
          |
          +---- Tickets
          |
          +---- Comments
          |
          +---- Notifications
          |
          +---- Audit Logs

Categories
  |
  +---- Tickets

Tickets
  |
  +---- Comments
  |
  +---- Attachments
  |
  +---- Ticket History
  |
  +---- Service Requests

Service Requests
  |
  +---- Approvals
```

The database also contains indexes for commonly used ticket, notification, and audit log fields to improve query performance.

---

## API Documentation

The project uses **Swagger with OpenAPI 3.0** for API documentation.

After running the backend, Swagger UI is available at:

```text
http://localhost:5000/api-docs
```

### Authentication APIs

```text
POST /api/auth/login
POST /api/auth/register
GET  /api/auth/me
POST /api/auth/change-password
```

### Ticket APIs

```text
GET  /api/tickets
POST /api/tickets
GET  /api/tickets/:id
PATCH /api/tickets/:id

POST /api/tickets/:id/assign
POST /api/tickets/:id/resolve
POST /api/tickets/:id/reopen
POST /api/tickets/:id/close

GET  /api/tickets/:id/comments
POST /api/tickets/:id/comments

GET  /api/tickets/:id/attachments
POST /api/tickets/:id/attachments

GET  /api/tickets/:id/attachments/:fileId/download
GET  /api/tickets/:id/history
```

### User APIs

```text
GET   /api/users
GET   /api/users/:id
POST  /api/users
PATCH /api/users/:id
```

### Team APIs

```text
GET    /api/teams
POST   /api/teams
PATCH  /api/teams/:id
DELETE /api/teams/:id
GET    /api/teams/:id/members
```

### Category APIs

```text
GET    /api/categories
POST   /api/categories
DELETE /api/categories/:id
```

### Approval APIs

```text
GET  /api/approvals
POST /api/approvals
POST /api/approvals/:id/approve
POST /api/approvals/:id/reject
GET  /api/approvals/:id/history
```

### Notification APIs

```text
GET   /api/notifications
PATCH /api/notifications/read-all
PATCH /api/notifications/:id/read
```

### Dashboard APIs

```text
GET /api/dashboard
GET /api/dashboard/reports
```

### Audit API

```text
GET /api/audit-logs
```

Audit logs are accessible only to Admin users.

---

## Authentication and Authorization

The application uses **JWT authentication**.

When a user logs in successfully, the backend creates a JWT token.

The token contains:

* User ID
* User role
* User email

Protected APIs require the token in the Authorization header.

```text
Authorization: Bearer <token>
```

Passwords are hashed using **bcrypt** before storing them in the database.

### User Roles

There are four roles:

| Role     | Access                              |
| -------- | ----------------------------------- |
| Employee | Create and manage own tickets       |
| Agent    | Work on tickets and resolve them    |
| Manager  | Manage tickets, teams and approvals |
| Admin    | Full application access             |

Authorization is handled using middleware.

The backend checks both authentication and the user's role before allowing protected actions.

---

## Ticket Workflow

Tickets follow this workflow:

```text
OPEN
  |
  v
ASSIGNED
  |
  v
IN_PROGRESS
  |
  v
WAITING_FOR_USER
  |
  v
RESOLVED
  |
  v
CLOSED
```

A resolved ticket can be reopened when required.

Tickets can also be cancelled when applicable.

---

## SLA Implementation

SLA is calculated based on ticket priority.

The SLA rules implemented in the application are:

| Priority | Response Time | Resolution Time |
| -------- | ------------: | --------------: |
| Critical |    15 minutes |         4 hours |
| High     |    30 minutes |         8 hours |
| Medium   |       2 hours |        24 hours |
| Low      |       8 hours |        72 hours |

When a ticket is created, the system calculates:

* Response deadline
* Resolution deadline

The SLA status can be:

```text
ON_TRACK
AT_RISK
BREACHED
```

### SLA Rules

* `ON_TRACK` means enough time is available.
* `AT_RISK` means less than 30 minutes are remaining.
* `BREACHED` means the deadline has passed.

The SLA logic is implemented in:

```text
backend/src/utils/sla.ts
```

---

## Background Jobs and Notifications

The application uses **Redis and BullMQ** for background notification jobs.

Instead of creating notifications directly during every API request, the backend adds a job to the notification queue.

```text
Ticket Action
     |
     v
BullMQ Queue
     |
     v
Redis
     |
     v
Notification Worker
     |
     v
PostgreSQL
     |
     v
Notification
```

Notifications are generated for important actions such as:

* Ticket creation
* Ticket assignment
* Ticket status changes
* Ticket comments
* Ticket resolution
* Approval requests
* Approval decisions

The notification worker is implemented in:

```text
backend/src/workers/notifWorker.ts
```

This approach keeps background work separate from the main API request.

---

## Testing Strategy

The project contains both backend and frontend tests.

### Backend Testing

Backend tests use:

* Jest
* Supertest

The tests cover:

* Login validation
* Invalid login
* Health check
* Authentication
* Protected APIs
* Role-based access
* SLA calculation

Backend tests are located in:

```text
backend/src/__tests__/
```

Run backend tests:

```bash
cd backend
npm test
```

### Frontend Testing

Frontend tests use:

* Vitest
* React Testing Library

The frontend currently tests protected routes and authentication-related behavior.

Run frontend tests:

```bash
cd frontend
npm test
```

---

## Security Considerations

The application includes several security measures.

### Password Security

Passwords are hashed using bcrypt before they are stored.

### Authentication

Protected APIs require a valid JWT token.

### Authorization

User roles are checked on the backend.

### HTTP Security

Helmet is used to add secure HTTP headers.

### Rate Limiting

Rate limiting is enabled for APIs.

General API limit:

```text
200 requests / 15 minutes
```

Login limit:

```text
20 requests / 15 minutes
```

### File Upload Security

File uploads have a maximum size of 10 MB.

Uploaded files are stored with generated filenames.

### Environment Variables

Sensitive configuration such as database URLs and JWT secrets is stored in environment variables.

`.env` files should not be committed to GitHub.

---

## Local Setup

### Requirements

Install:

* Node.js
* Docker
* Docker Compose
* Git

### Clone the Project

```bash
git clone <YOUR_REPOSITORY_URL>
cd Assignment
```

### Install Backend Dependencies

```bash
cd backend
npm install
```

### Install Frontend Dependencies

Open another terminal:

```bash
cd frontend
npm install
```

---

## Environment Variables

Create a `.env` file inside the `backend` folder.

Example:

```env
PORT=5000
DATABASE_URL=postgresql://itsm_user:itsm_pass@localhost:5432/itsm_db
JWT_SECRET=change_this_secret_in_production
JWT_EXPIRES_IN=7d
REDIS_URL=redis://localhost:6379
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Do not commit `.env` to GitHub.

An example environment file is available at:

```text
backend/.env.example
```

---

## Running Without Docker

### Start Backend

```bash
cd backend
npm run dev
```

Backend runs on:

```text
http://localhost:5000
```

### Start Frontend

```bash
cd frontend
npm run dev
```

Frontend runs on:

```text
http://localhost:3000
```

---

## Docker Setup

The project includes Dockerfiles for both frontend and backend.

Docker Compose runs these services:

* PostgreSQL
* Redis
* Backend
* Frontend

### Start All Services

```bash
docker compose up -d
```

### Rebuild Services

```bash
docker compose up --build
```

### Stop Services

```bash
docker compose down
```

After starting Docker:

Frontend:

```text
http://localhost:3000
```

Backend:

```text
http://localhost:5000
```

Swagger:

```text
http://localhost:5000/api-docs
```

PostgreSQL:

```text
localhost:5432
```

Redis:

```text
localhost:6379
```

---

## Deployment

The application can be deployed using Docker on a cloud server or a platform that supports Docker.

### Frontend

```text
https://itsm-frontend-8jwz.onrender.com
```

### Backend

```text
https://itsm-backend-qfux.onrender.com
```

### Swagger API Documentation

```text
https://itsm-backend-qfux.onrender.com/api-docs
```

Replace the above placeholders with the actual deployment URLs before submitting the project.

---

## Known Limitations

* Email notifications are not implemented.
* SLA rules are currently defined in code.
* File storage currently uses local storage.
* Advanced search can be improved for very large datasets.
* More end-to-end tests can be added.
* Password reset through email is not implemented.

---

## Future Improvements

Some possible future improvements are:

* Email notifications
* Password reset functionality
* Admin UI for changing SLA rules
* Cloud file storage such as AWS S3
* Advanced ticket search
* More end-to-end tests
* Better monitoring and logging
* More detailed reports and analytics

---

## Important Technical Decisions and Trade-offs

### PostgreSQL

PostgreSQL is used because the application has many related tables and requires reliable relational data.

### React and TypeScript

React is used for the frontend because it makes it easy to build reusable UI components.

TypeScript provides better type safety.

### Node.js and Express

Node.js and Express are used to build the REST API.

They provide a simple structure for handling routes and backend logic.

### JWT

JWT is used for authentication because it works well with REST APIs and allows the backend to verify users without maintaining server-side sessions.

### Redis and BullMQ

Redis and BullMQ are used for background notification jobs.

This prevents notification processing from slowing down the main API request.

### Docker

Docker is used to keep the development environment consistent and make it easier to run the frontend, backend, database, and Redis together.

### Swagger

Swagger with OpenAPI 3.0 is used to document and test the backend APIs.

---

## Project Structure

```text
Assignment/
│
├── backend/
│   ├── migrations/
│   ├── seeds/
│   └── src/
│       ├── routes/
│       ├── middleware/
│       ├── utils/
│       ├── workers/
│       └── __tests__/
│
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── context/
│       ├── api/
│       └── __tests__/
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

## Health Check

The backend provides a health check endpoint:

```text
GET /health
```

Response:

```json
{
  "status": "ok"
}
```

A readiness endpoint is also available:

```text
GET /ready
```

It checks whether the application can connect to the database.

---

## Conclusion

This project provides a complete IT Service Management system with ticket management, SLA tracking, authentication, role-based access, approvals, notifications, audit logs, and reporting.

The application is built using React, Node.js, PostgreSQL, Redis, BullMQ, Docker, and Swagger.
