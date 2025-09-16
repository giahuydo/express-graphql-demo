# Express GraphQL Demo

A modern Express.js application with GraphQL and Apollo Server, featuring simplified business entities: User, Event, and Voucher management with advanced edit locking system.

## 🚀 Features

### User Management
- User registration and login with JWT authentication
- Simple user profile management (email, name, role)
- Role-based access control (user/admin)
- Password change functionality

### Event Management
- Create and manage events with quantity limits
- Edit locking system to prevent conflicts
- Pagination and search capabilities
- Event activation/deactivation
- Automatic issued count tracking

### Voucher System
- Create vouchers linked to specific events
- Automatic voucher code generation
- Issue vouchers to users
- Track voucher usage status
- Event quantity validation

### Advanced Features
- **Edit Lock System**: Prevents multiple users from editing the same event simultaneously
- **Atomic Operations**: Uses MongoDB sessions for data consistency
- **Pagination**: Advanced pagination with search and filtering
- **Race Condition Prevention**: Handles concurrent operations safely
- **Queue System**: Background job processing with Redis and Bull
- **Email Notifications**: Automated email sending for user actions
- **Real-time Monitoring**: Queue statistics and job monitoring

## 🛠️ Technology Stack

- **Backend**: Node.js, Express.js
- **GraphQL**: Apollo Server Express
- **Database**: MongoDB with Mongoose
- **Queue System**: Redis with Bull
- **Email Service**: Nodemailer
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Environment**: dotenv

## 📦 Installation & Setup

1. **Clone the repository:**
```bash
git clone <repository-url>
cd express-graphql-demo
```

2. **Install dependencies:**
```bash
npm install
```

3. **Create environment file:**
```bash
cp env.example .env
```

4. **Configure environment variables in `.env`:**
```env
PORT=4000
MONGODB_URI=mongodb://localhost:27017/express-graphql-demo
JWT_SECRET=your-super-secret-jwt-key-here
NODE_ENV=development

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Email Configuration (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Application Configuration
APP_NAME=Express GraphQL Demo
FRONTEND_URL=http://localhost:3000
```

5. **Start required services:**
```bash
# Start MongoDB (if not already running)
mongod

# Start Redis (if not already running)
redis-server
```

6. **Run the server (Terminal 1):**
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

## 🎯 API Endpoints

- **GraphQL Playground**: http://localhost:4000/graphql
- **GraphQL Endpoint**: http://localhost:4000/graphql
- **REST API Documentation**: http://localhost:4000/api-docs
- **REST API Base URL**: http://localhost:4000/api
- **Health Check**: http://localhost:4000/api/health
- **API Info**: http://localhost:4000/api

7. **Run the workers (Terminal 2):**
```bash
# Development mode with auto-restart
npm run worker:dev

# Production mode
npm run worker
```

## 🔄 Queue System

The application includes a robust queue system for background job processing:

### Email Jobs
- **Welcome Email**: Sent when new users register
- **Voucher Email**: Sent when vouchers are issued to users
- **Password Reset Email**: Sent for password reset requests
- **Notification Email**: General notification emails

### Notification Jobs
- **Event Created**: Notify admins when new events are created
- **Event Updated**: Notify admins when events are modified
- **Event Deleted**: Notify admins when events are deleted
- **Voucher Issued**: Notify admins when vouchers are issued
- **Voucher Used**: Notify admins when vouchers are used
- **System Maintenance**: Notify users about system maintenance

### Queue Monitoring
- **Queue Statistics**: `/api/queue/stats` - Get queue job counts
- **Clean Jobs**: `/api/queue/clean` - Clean completed jobs
- **Test Email**: `/api/queue/test-email` - Test email sending
- **Test Notification**: `/api/queue/test-notification` - Test notification sending

### Queue Configuration
- **Redis**: Used as queue backend
- **Bull**: Job queue management
- **Retry Logic**: Failed jobs are retried with exponential backoff
- **Job Cleanup**: Completed jobs are automatically cleaned up

## 📊 Database Schema

### User
```typescript
interface UserDocument {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### Event
```typescript
interface EventDocument {
  name: string;
  description?: string;
  maxQuantity: number;
  issuedCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  editingBy: string | null;
  editLockAt: Date | null;
}
```

### Voucher
```typescript
interface VoucherDocument {
  eventId: mongoose.Types.ObjectId;
  code: string;
  issuedTo: string;
  isUsed: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

## 🔐 Authentication

Use JWT Bearer token in the Authorization header:
```
Authorization: Bearer <jwt-token>
```

## 📝 API Usage Examples

### REST API Examples

#### 1. User Registration
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

#### 2. User Login
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123"
  }'
```

#### 3. Create Event (Admin Only)
```bash
curl -X POST http://localhost:4000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "name": "Tech Conference 2024",
    "description": "Annual technology conference",
    "maxQuantity": 100
  }'
```

#### 4. Get Events with Pagination
```bash
curl "http://localhost:4000/api/events?limit=10&offset=0&isActive=true&search=tech"
```

#### 5. Lock Event for Editing
```bash
curl -X POST http://localhost:4000/api/events/EVENT_ID/lock \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

#### 6. Issue Voucher to User (Admin Only)
```bash
curl -X POST http://localhost:4000/api/vouchers/issue \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "eventId": "EVENT_ID_HERE",
    "issuedTo": "user@example.com"
  }'
```

#### 7. Use Voucher
```bash
curl -X POST http://localhost:4000/api/vouchers/VOUCHER_ID/use \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### GraphQL Usage Examples

### 1. User Registration
```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    token
    user {
      id
      email
      name
      role
      isActive
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }
}
```

### 2. User Login
```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    token
    user {
      id
      email
      name
      role
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "email": "user@example.com",
    "password": "password123"
  }
}
```

### 3. Get Current User
```graphql
query Me {
  me {
    id
    email
    name
    role
    isActive
    events {
      id
      name
      maxQuantity
      issuedCount
      availableQuantity
    }
    vouchers {
      id
      code
      isUsed
      event {
        name
      }
    }
  }
}
```

### 4. Create Event (Admin Only)
```graphql
mutation CreateEvent($input: CreateEventInput!) {
  createEvent(input: $input) {
    id
    name
    description
    maxQuantity
    issuedCount
    availableQuantity
    isFullyIssued
    isActive
    createdAt
  }
}
```

**Variables:**
```json
{
  "input": {
    "name": "Tech Conference 2024",
    "description": "Annual technology conference",
    "maxQuantity": 100
  }
}
```

### 5. Get Events with Pagination
```graphql
query GetEvents($limit: Int, $offset: Int, $isActive: Boolean, $search: String) {
  events(limit: $limit, offset: $offset, isActive: $isActive, search: $search) {
    id
    name
    description
    maxQuantity
    issuedCount
    availableQuantity
    isFullyIssued
    isActive
    createdAt
    editingBy
    editLockAt
  }
}
```

**Variables:**
```json
{
  "limit": 10,
  "offset": 0,
  "isActive": true,
  "search": "tech"
}
```

### 6. Lock Event for Editing
```graphql
mutation LockEventForEditing($id: ID!) {
  lockEventForEditing(id: $id) {
    id
    name
    editingBy
    editLockAt
  }
}
```

### 7. Update Event (with Lock Validation)
```graphql
mutation UpdateEvent($id: ID!, $input: UpdateEventInput!) {
  updateEvent(id: $id, input: $input) {
    id
    name
    description
    maxQuantity
    issuedCount
    availableQuantity
    updatedAt
  }
}
```

### 8. Issue Voucher to User (Admin Only)
```graphql
mutation IssueVoucherToUser($input: IssueVoucherInput!) {
  issueVoucherToUser(input: $input) {
    id
    code
    issuedTo
    isUsed
    createdAt
    event {
      id
      name
      maxQuantity
      issuedCount
    }
  }
}
```

**Variables:**
```json
{
  "input": {
    "eventId": "EVENT_ID_HERE",
    "issuedTo": "john.doe@example.com"
  }
}
```

### 9. Use Voucher
```graphql
mutation UseVoucher($id: ID!) {
  useVoucher(id: $id) {
    id
    code
    issuedTo
    isUsed
    updatedAt
    event {
      name
    }
  }
}
```

### 10. Get User's Vouchers
```graphql
query UserVouchers($issuedTo: String!) {
  userVouchers(issuedTo: $issuedTo) {
    id
    code
    isUsed
    createdAt
    event {
      id
      name
      description
      isActive
    }
  }
}
```

## 🚀 Available Scripts

- `npm start`: Run server in production mode
- `npm run dev`: Run server in development mode with auto-restart
- `npm test`: Run tests (to be implemented)

## 📁 Project Structure

```
src/
├── config/
│   ├── database.js          # MongoDB connection setup
│   └── swagger.js           # Swagger/OpenAPI configuration
├── models/
│   ├── User.js             # User model with authentication
│   ├── Event.js            # Event model with edit locking
│   └── Voucher.js          # Voucher model
├── resolvers/
│   ├── auth.js             # Authentication resolvers
│   ├── user.js             # User management resolvers
│   ├── event.js            # Event management with locking
│   ├── voucher.js          # Voucher management resolvers
│   └── index.js            # Combined resolvers
├── routes/
│   ├── auth.js             # REST API authentication routes
│   ├── events.js           # REST API event routes
│   └── vouchers.js         # REST API voucher routes
├── schema/
│   └── typeDefs.js         # GraphQL schema definitions
├── utils/
│   ├── lockManager.js      # Edit locking system
│   └── pagination.js       # Pagination utilities
└── server.js               # Main Express server with GraphQL + REST
```

## 🔧 Key Features Explained

### Edit Locking System
- **Purpose**: Prevents multiple users from editing the same event simultaneously
- **Timeout**: 5 minutes automatic release
- **Atomic Operations**: Uses MongoDB sessions for consistency
- **Race Condition Prevention**: Handles concurrent lock requests safely

### Pagination System
- **Search**: Full-text search across multiple fields
- **Filtering**: Advanced filtering with operators (gte, lte, gt, lt)
- **Performance**: Optimized queries with proper indexing

### Voucher Management
- **Auto-generation**: Unique voucher codes with timestamp and random string
- **Quantity Tracking**: Automatic issued count updates
- **Validation**: Prevents over-issuance beyond event limits

## 🛡️ Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Role-based access control
- Input validation and sanitization
- MongoDB injection prevention
- CORS enabled for cross-origin requests
- Bearer token authentication for protected routes

## 📚 API Documentation

### Swagger/OpenAPI Documentation
The project includes comprehensive API documentation using Swagger/OpenAPI 3.0:

- **Interactive Documentation**: http://localhost:4000/api-docs
- **OpenAPI Spec**: Available at `/api-docs` endpoint
- **Try It Out**: Test API endpoints directly from the documentation
- **Authentication**: Built-in JWT token testing in Swagger UI

### Documentation Features
- Complete REST API documentation
- Request/response schemas
- Authentication examples
- Error response documentation
- Interactive testing interface
- Code generation support

## 📈 Development Roadmap

- [ ] Add comprehensive test suite with Jest
- [ ] Implement input validation with Joi/Yup
- [ ] Add rate limiting for API protection
- [ ] Implement structured logging with Winston
- [ ] Add file upload for event images
- [ ] Implement email notifications
- [ ] Add Redis caching for performance
- [ ] Create API documentation with Swagger
- [ ] Add database migrations
- [ ] Implement audit logging

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

