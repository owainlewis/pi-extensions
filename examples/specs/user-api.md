# User Management API

A FastAPI-based REST API for user management with CRUD operations, built using UV for dependency management.

## Overview

Build a production-ready user management API with proper validation, error handling, and comprehensive test coverage.

## Technical Stack

- **Framework**: FastAPI
- **Package Manager**: UV (https://github.com/astral-sh/uv)
- **Database**: In-memory (dict) for simplicity (can be upgraded to SQLite/Postgres later)
- **Password Hashing**: bcrypt
- **Testing**: pytest with FastAPI TestClient
- **Validation**: Pydantic models

## Requirements

### Data Model

```python
User:
  id: UUID (auto-generated)
  username: str (3-30 chars, alphanumeric + underscore)
  email: str (valid email format)
  password_hash: str (never returned in responses)
  created_at: datetime
  updated_at: datetime
```

### API Endpoints

**1. POST /api/users** - Create user
- Request body: `{ "username": "john", "email": "john@example.com", "password": "secret123" }`
- Validation: username length, email format, password min 8 chars
- Hash password with bcrypt
- Return: User object (without password_hash)
- Status codes: 201 Created, 400 Bad Request, 409 Conflict (duplicate username/email)

**2. GET /api/users/{user_id}** - Get user by ID
- Return: User object (without password_hash)
- Status codes: 200 OK, 404 Not Found

**3. GET /api/users** - List all users
- Query params: `skip` (default 0), `limit` (default 10)
- Return: Array of users (without password_hash)
- Status codes: 200 OK

**4. PUT /api/users/{user_id}** - Update user
- Request body: `{ "username": "john_updated", "email": "new@example.com" }`
- Cannot update password through this endpoint
- Validation: same as create
- Return: Updated user object
- Status codes: 200 OK, 400 Bad Request, 404 Not Found, 409 Conflict

**5. DELETE /api/users/{user_id}** - Delete user
- Return: Success message
- Status codes: 204 No Content, 404 Not Found

### Validation Rules

**Username:**
- 3-30 characters
- Alphanumeric and underscore only
- Required

**Email:**
- Valid email format (contains @, domain, TLD)
- Required

**Password (creation only):**
- Minimum 8 characters
- Required

### Error Response Format

All errors return consistent JSON:
```json
{
  "detail": "Error message here"
}
```

## Project Structure

```
user-api/
├── pyproject.toml           # UV project file with dependencies
├── main.py                  # FastAPI app and endpoints
├── models.py                # Pydantic models (UserCreate, UserUpdate, UserResponse)
├── database.py              # In-memory database operations
├── auth.py                  # Password hashing utilities
├── tests/
│   ├── test_api.py          # API endpoint tests
│   ├── test_models.py       # Model validation tests
│   └── test_auth.py         # Password hashing tests
└── README.md                # Usage instructions
```

## Test Coverage

### Unit Tests

**Password Hashing (test_auth.py):**
- Hash password successfully
- Verify correct password
- Verify incorrect password
- Handle empty/None passwords

**Model Validation (test_models.py):**
- Valid user creation
- Invalid username (too short, too long, special chars)
- Invalid email format
- Missing required fields

### API Tests (test_api.py)

**Create User:**
- Successfully create user
- Duplicate username (409)
- Duplicate email (409)
- Invalid username format (400)
- Invalid email format (400)
- Password too short (400)
- Missing required fields (400)
- Password not in response

**Get User:**
- Successfully get existing user
- Non-existent user (404)
- Invalid UUID format (400)

**List Users:**
- List all users
- Pagination works (skip/limit)
- Empty list
- Password not in responses

**Update User:**
- Successfully update username
- Successfully update email
- Update non-existent user (404)
- Duplicate username after update (409)
- Duplicate email after update (409)
- Invalid data (400)

**Delete User:**
- Successfully delete user
- Delete non-existent user (404)
- Verify user actually deleted

## Code Quality Standards

### Documentation
- Docstrings for all functions
- API endpoint documentation
- README with setup and usage instructions
- Example curl commands

### Type Hints
- All function parameters typed
- All return types specified
- Pydantic models for validation

### Error Handling
- Proper HTTP status codes
- Descriptive error messages
- Validation errors with field details

### Code Organization
- Separate concerns (models, database, auth, routes)
- Clear function names
- No magic numbers
- Constants defined at top

## Running the API

### Setup
```bash
# Install UV
curl -LsSf https://astral.sh/uv/install.sh | sh

# Create project
cd user-api
uv init

# Install dependencies
uv add fastapi uvicorn bcrypt pydantic pytest httpx

# Run server
uv run uvicorn main:app --reload
```

### Testing
```bash
# Run all tests
uv run pytest

# Run with coverage
uv run pytest --cov=. --cov-report=term-missing
```

## Example Usage

### Create a user
```bash
curl -X POST http://localhost:8000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john@example.com",
    "password": "secret123"
  }'
```

Response:
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "username": "johndoe",
  "email": "john@example.com",
  "created_at": "2025-01-15T10:30:00",
  "updated_at": "2025-01-15T10:30:00"
}
```

### Get user
```bash
curl http://localhost:8000/api/users/123e4567-e89b-12d3-a456-426614174000
```

### List users
```bash
curl http://localhost:8000/api/users?skip=0&limit=10
```

### Update user
```bash
curl -X PUT http://localhost:8000/api/users/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe_updated",
    "email": "john.updated@example.com"
  }'
```

### Delete user
```bash
curl -X DELETE http://localhost:8000/api/users/123e4567-e89b-12d3-a456-426614174000
```

## Success Criteria

- All endpoints implemented and working
- All tests passing (aim for 90%+ coverage)
- Proper validation on all inputs
- Correct HTTP status codes
- Passwords securely hashed
- No passwords in API responses
- Clear error messages
- Code is clean and well-documented
- README with complete usage instructions
- Can run with `uv run uvicorn main:app`
- Can test with `uv run pytest`

## Non-Requirements

- Authentication/authorization (JWT tokens, etc.) - Keep it simple
- Database migrations - Using in-memory storage
- Advanced features (pagination sorting, filtering) - Basic pagination only
- Email verification - Trust the email format validation
- Rate limiting - Not needed for demo
