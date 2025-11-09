# CAS Login Fix Summary

## Problem
The CAS login was causing a redirect loop ("redirects to fed.princeton.edu too many times"). This is a common issue when:
1. The application is not registered with Princeton CAS
2. The service URL doesn't match what's registered
3. Using the wrong CAS protocol version

## Fixes Applied

### 1. Updated CAS Protocol Version (CASClient.py)
- **Changed from**: CAS 1.0 protocol (`validate` endpoint)
- **Changed to**: CAS 2.0 protocol (`serviceValidate` endpoint)
- **Why**: Princeton CAS documentation specifies using CAS 2.0 or 3.0 protocol
- **Location**: `backend/six_degrees/CASClient.py` - `validate()` method

### 2. Fixed CAS Login URL
- **Changed from**: Using relative URL from `cas_url`
- **Changed to**: Hardcoded full Princeton CAS URL: `https://fed.princeton.edu/cas/login`
- **Why**: Ensures we're using the correct Princeton CAS server
- **Location**: `backend/six_degrees/CASClient.py` - `authenticate()` method

### 3. Updated Validation Response Parsing
- **Changed from**: Parsing plain text response (CAS 1.0 format)
- **Changed to**: Parsing XML response (CAS 2.0 format) using regex to extract `<cas:user>` tag
- **Why**: CAS 2.0 returns XML instead of plain text
- **Location**: `backend/six_degrees/CASClient.py` - `validate()` method

### 4. Added Session Persistence
- Added `self.request.session.save()` after storing username
- **Why**: Ensures authentication state persists across requests
- **Location**: `backend/six_degrees/CASClient.py` - `authenticate()` method

### 5. Improved Redirect Handling
- Added redirect parameter to return user to frontend after login
- Added URL parameter parsing in frontend to detect successful authentication
- **Why**: Better user experience - returns to the end page after login
- **Location**: 
  - `backend/six_degrees/views.py` - `cas_login()` function
  - `frontend/src/EndPage.js` - `useEffect()` hook

## ⚠️ CRITICAL: Application Registration Required

**The redirect loop will continue until your application is registered with Princeton CAS.**

According to the Princeton CAS documentation:
> "If you are an application owner that needs to use CAS and are receiving an 'Application not authorized to use CAS...' error message, contact the Service Desk stating the business need."

### Steps to Register Your Application:

1. **Fill out the Single Sign-on Integration Request Form**
   - URL: https://princeton.service-now.com/sso
   - You'll need to provide:
     - Your application's service URL (e.g., `http://localhost:8080/api/six_degrees/login/`)
     - Business justification for using CAS
     - Contact information

2. **Wait for Approval**
   - Princeton IT will review and approve your request
   - They'll register your service URL with CAS

3. **Update Service URL if Needed**
   - Once registered, make sure the service URL in your code matches what you registered
   - For production, you'll need to register your production URL

### Current Service URL Configuration

The service URL is automatically generated from the current request URL (with ticket parameter stripped). This is done in `CASClient.stripTicket()` method.

For local development, your service URL will be something like:
- `http://localhost:8080/api/six_degrees/login/`

For production, you'll need to register your production domain.

## Testing After Registration

Once your application is registered:

1. Click "Login with CAS" button
2. You should be redirected to `https://fed.princeton.edu/cas/login`
3. Enter your Princeton netID and password
4. You should be redirected back to your application with authentication success
5. The modal should close and show "Logged in as: [username]"

## Additional Notes

- **HTTPS Requirement**: CAS TGC (ticket granting cookie) is only returned if your site uses HTTPS. For local development with HTTP, the cookie won't work, but authentication should still function.
- **Session Timeout**: CAS sessions last up to 12 hours
- **Single Sign-On**: Once logged into CAS, users are automatically logged into other CAS-enabled applications

## Contact

If you continue to experience issues after registration:
- Contact Princeton Service Desk: helpdesk@princeton.edu or (609) 258-4357
- Mention that you're getting a redirect loop and have already registered your application

