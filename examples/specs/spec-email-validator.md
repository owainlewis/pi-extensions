# Email Validator Feature Spec

## Goal
Create a robust email validation library in Python with comprehensive testing.

## Requirements

### Core Functionality
1. **validate_email(email: str) -> bool**
   - Returns True if email is valid, False otherwise
   - Must check for @ symbol
   - Must validate domain format
   - Must validate TLD (top-level domain)
   - Handle None and empty strings gracefully

2. **validate_email_strict(email: str) -> tuple[bool, Optional[str]]**
   - Returns (is_valid, error_message)
   - Provides detailed error messages for invalid emails
   - Useful for user feedback

### Validation Rules
- Email must contain exactly one @ symbol
- Local part (before @) can contain: letters, numbers, dots, underscores, hyphens, plus signs
- Domain must contain at least one dot
- TLD must be at least 2 characters
- No spaces allowed anywhere
- Handle special cases: empty string, None, whitespace-only

### Test Coverage
Write comprehensive tests for:
- Valid email formats (simple, with dots, with plus, with hyphens)
- Invalid formats (no @, multiple @, no domain, no TLD)
- Edge cases (None, empty, whitespace, special characters)
- International characters (basic support)
- Very long emails
- Boundary cases for TLD length

### Code Quality
- Use type hints throughout
- Add docstrings to all functions
- Use regex for pattern matching
- Keep functions small and focused
- Add inline comments for complex logic

### File Structure
```
src/
  email_validator.py    # Main implementation
tests/
  test_email_validator.py  # Test suite
README.md              # Usage documentation
```

### Expected Behavior Examples
```python
# Valid
validate_email("user@example.com")  # True
validate_email("test.user@domain.co.uk")  # True
validate_email("name+tag@company.org")  # True

# Invalid
validate_email("notanemail")  # False
validate_email("user@")  # False
validate_email("@domain.com")  # False
validate_email("")  # False
validate_email(None)  # False

# Strict mode
validate_email_strict("user@example.com")  # (True, None)
validate_email_strict("notemail")  # (False, "Email must contain @ symbol")
```

## Success Criteria
- All tests pass
- 100% of requirements implemented
- Code is clean and well-documented
- No linting errors
- Performance is acceptable (< 1ms per validation)
