# Contributing to QTEngineEx

## Welcome Contributors! 🌟

We're thrilled that you're interested in contributing to QTEngineEx. This document provides guidelines for contributing to the project.

## 🤝 How to Contribute

### 1. Reporting Issues
- Use GitHub Issues to report bugs or suggest features
- Provide detailed information:
  - Detailed description
  - Steps to reproduce
  - Expected vs. actual behavior
  - Screenshots (if applicable)
  - Browser and extension version

### 2. Development Process

#### Prerequisites
- Chrome Browser
- Python 3.8+
- Node.js and npm
- Git

#### Setup
1. Fork the repository
2. Clone your fork
   ```bash
   git clone https://github.com/[YOUR_USERNAME]/QTEngineEx.git
   cd QTEngineEx
   ```
3. Install dependencies
   ```bash
   # For QTEngine Server
   cd QTEngineServer
   pip install -r requirements.txt

   # For Chrome Extension
   cd ..
   npm install
   ```

#### Development Workflow
1. Create a new branch
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Write tests for your changes
4. Run tests
   ```bash
   # Python tests
   cd QTEngineServer
   pytest

   # JavaScript tests
   cd ..
   npm test
   ```
5. Commit your changes
   ```bash
   git add .
   git commit -m "Description of changes"
   ```
6. Push to your fork
   ```bash
   git push origin feature/your-feature-name
   ```
7. Open a Pull Request

### 3. Code Guidelines

#### Python (QTEngine Server)
- Follow PEP 8 style guide
- Use type hints
- Write docstrings for all functions
- 100% test coverage for new code

#### JavaScript (Chrome Extension)
- Use ES6+ syntax
- Follow Google JavaScript Style Guide
- Write clear, concise comments
- Use ESLint for code quality

#### General
- Keep code modular and readable
- Add appropriate error handling
- Document new features and changes

### 4. Translation Contributions
- Help improve translation accuracy
- Provide context for complex translations
- Suggest improvements to translation algorithms

### 5. Documentation
- Update README, docs, and comments
- Improve installation and usage instructions
- Add examples and use cases

## 🛡️ Code of Conduct
- Be respectful and inclusive
- Constructive feedback only
- No harassment or discrimination

## 🏆 Recognition
Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Potentially invited to core team

## 📞 Contact
- Open an Issue
- Email: support@qtengineex.com

**Thank you for making QTEngineEx better! 🚀**
