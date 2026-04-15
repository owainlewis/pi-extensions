# REST API User Management Spec

## Goal
Create a RESTful API for user management with CRUD operations, authentication, and validation.

## Requirements

### Endpoints

1. **POST /api/users** - Create new user
   - Accept: username, email, password
   - Validate email format
   - Hash password with bcrypt
   - Return: user object (without password)
   - Status: 201 Created

2. **GET /api/users/:id** - Get user by ID
   - Return: user object (without password)
   - Status: 200 OK or 404 Not Found

3. **GET /api/users** - List all users
   - Support pagination (page, limit)
   - Return: array of users
   - Status: 200 OK

4. **PUT /api/users/:id** - Update user
   - Accept: username, email
   - Validate changes
   - Return: updated user object
   - Status: 200 OK or 404 Not Found

5. **DELETE /api/users/:id** - Delete user
   - Return: success message
   - Status: 204 No Content or 404 Not Found

### Validation Rules
- Email must be valid format
- Username 3-30 characters, alphanumeric
- Password minimum 8 characters
- All fields required for creation

### Error Handling
- 400 Bad Request - Invalid input
- 404 Not Found - User not exists
- 409 Conflict - Email/username already exists
- 500 Internal Server Error - Server errors

### Data Model
```python
User {
  id: string (UUID)
  username: string
  email: string
  password_hash: string
  created_at: datetime
  updated_at: datetime
}
```

## Test Coverage

### Unit Tests
- Email validation
- Password hashing
- Input validation
- Database operations

### Integration Tests
- Create user endpoint
- Get user endpoint
- List users with pagination
- Update user endpoint
- Delete user endpoint
- Error responses (400, 404, 409)
- Edge cases (empty fields, invalid IDs)

### Test Data
- Valid user data
- Invalid emails
- Short/long usernames
- Weak passwords
- Duplicate entries

## Code Quality

### Structure
```
src/
  api/
    routes/
      users.py
    models/
      user.py
    validators/
      user_validator.py
  database/
    connection.py
  utils/
    password.py
tests/
  test_users_api.py
  test_user_model.py
  test_validators.py
README.md
requirements.txt
```

### Standards
- Type hints throughout
- Docstrings for all functions
- RESTful conventions
- Proper HTTP status codes
- JSON responses
- Error messages with details

### Dependencies
- Flask or FastAPI
- SQLAlchemy for database
- bcrypt for password hashing
- pytest for testing
- pydantic for validation

## Success Criteria

- All endpoints implemented
- All tests passing
- Proper error handling
- Input validation working
- Passwords securely hashed
- API documentation in README
- Postman/curl examples provided
- Response time < 100ms for CRUD operations

## Example Usage

```bash
# Create user
curl -X POST http://localhost:5000/api/users \
  -H "Content-Type: application/json" \
  -d '{"username": "john", "email": "john@example.com", "password": "secret123"}'

# Get user
curl http://localhost:5000/api/users/123

# List users
curl http://localhost:5000/api/users?page=1&limit=10

# Update user
curl -X PUT http://localhost:5000/api/users/123 \
  -H "Content-Type: application/json" \
  -d '{"username": "johnny", "email": "johnny@example.com"}'

# Delete user
curl -X DELETE http://localhost:5000/api/users/123
```

## Documentation Requirements

README should include:
- Setup instructions
- API endpoint documentation
- Example requests/responses
- Error response formats
- Running tests
- Environment variables
