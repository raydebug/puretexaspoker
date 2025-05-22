# Development Workflow

## Process Overview
1. Check existing documentation (README.md, apis.md) before starting work
2. Create feature branch from main
3. Implement changes following best practices
4. Run tests and fix any issues
5. Submit pull request
6. Review and merge after approval

## Testing Workflow

### 1. Unit Tests
- Write tests before implementing features
- Run tests frequently during development
- Fix failing tests immediately
- Maintain high test coverage for critical components

### 2. End-to-End Tests
- Run full test suite before submitting PR
- Add new test cases for new features
- Document test scenarios in feature files
- Focus on game logic and user interactions

### Running Tests
1. Check current working directory before running any commands
2. Start development servers
3. Run tests in appropriate mode (headed/headless)
4. Check test results and fix any failures

## Best Practices

### Code Quality
- Follow TypeScript best practices
- Maintain consistent code style
- Document complex logic
- Write meaningful commit messages

### Version Control
- Create feature branches for new development
- Keep commits atomic and focused
- Write clear commit messages
- Review code before merging

### Command Execution
- Always check current path before running commands
- Verify environment is ready (servers running, dependencies installed)
- Monitor command output for errors
- Handle errors appropriately before proceeding

## Documentation
- Keep README.md updated with setup and development details
- Document API changes in apis.md
- Update test documentation
- Maintain changelog

## API Documentation
- Create and maintain apis.md for all API details
- Check apis.md before implementing any API-related features
- Update apis.md when:
  - Adding new endpoints
  - Modifying existing endpoints
  - Changing request/response formats
  - Adding new API parameters
  - Updating authentication requirements
  - Making breaking changes
- Include in apis.md:
  - Endpoint paths and methods
  - Request/response formats
  - Authentication requirements
  - Rate limiting details
  - Example requests and responses
  - Error codes and handling
  - API versioning information

## Deployment
1. Run full test suite
2. Build and test production builds
3. Deploy to staging environment
4. Run smoke tests
5. Deploy to production if all tests pass 