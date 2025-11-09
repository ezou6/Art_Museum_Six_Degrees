# CAS Authentication Integration

This app now includes CAS (Central Authentication Service) authentication for Princeton University users.

## Files Added/Modified

1. **`CASClient.py`** - Django-compatible CAS client adapted from the Flask version
2. **`views.py`** - Added authentication views and decorator
3. **`urls.py`** - Added authentication endpoints
4. **`settings.py`** - Added session configuration

## API Endpoints

### Authentication Endpoints

- **`GET /api/six_degrees/login/`** - Login via CAS
  - If not authenticated, redirects to Princeton CAS login
  - If already authenticated, returns user info
  - Returns: `{"authenticated": true, "username": "netid"}`

- **`GET /api/six_degrees/logout/`** - Logout from CAS
  - Clears session and redirects to CAS logout page
  - Optional query parameter: `?redirect=<url>` to specify redirect after logout

- **`GET /api/six_degrees/check_auth/`** - Check authentication status
  - Returns: `{"authenticated": true/false, "username": "netid"}` (if authenticated)

## Usage

### Flask-like Pattern: `netid = _cas.authenticate()`

The most common pattern (matching the Flask code) is to call `authenticate()` which will either:
- Return the netid if already authenticated
- Redirect to CAS login if not authenticated

```python
from .CASClient import CASClient
from django.http import HttpResponseRedirect

@api_view(['GET'])
def my_view(request):
    cas_client = CASClient(request)
    
    try:
        # This matches Flask: netid = _cas.authenticate()
        netid = cas_client.authenticate()
        netid = netid.rstrip()  # Strip whitespace like Flask version
        
        # Now use netid throughout your view
        return JsonResponse({
            "message": f"Hello, {netid}!",
            "netid": netid
        })
    except HttpResponseRedirect as redirect_response:
        return redirect_response  # User was redirected to CAS login
```

### Using the Helper Function (No Redirect)

If you want to check authentication without triggering a redirect:

```python
from .views import get_netid

@api_view(['GET'])
def my_view(request):
    netid = get_netid(request)
    
    if netid:
        netid = netid.rstrip()
        # User is authenticated
        return JsonResponse({"netid": netid})
    else:
        # User is not authenticated (but no redirect happened)
        return JsonResponse({"error": "Not authenticated"}, status=401)
```

### Using the Decorator (Automatic Redirect)

To automatically require authentication with redirect:

```python
from .views import cas_login_required, get_netid

@cas_login_required
@api_view(['GET'])
def protected_view(request):
    # At this point, user is guaranteed to be authenticated
    netid = get_netid(request)
    netid = netid.rstrip()
    
    return JsonResponse({
        "message": f"Hello, {netid}!",
        "netid": netid
    })
```

### Pattern Matching Flask Code Exactly

Here's how to match the Flask `redirect_landing()` pattern:

```python
from .CASClient import CASClient
from django.http import HttpResponseRedirect

@api_view(['GET'])
def dashboard(request):
    cas_client = CASClient(request)
    
    # Check if logged in (like redirect_landing())
    if not cas_client.is_logged_in():
        # Redirect to login
        try:
            cas_client.authenticate()  # Will redirect
        except HttpResponseRedirect as redirect_response:
            return redirect_response
    
    # Get netid (guaranteed to be authenticated here)
    netid = cas_client.authenticate()
    netid = netid.rstrip()
    
    # Use netid throughout the view
    return JsonResponse({
        "netid": netid,
        "message": f"Dashboard for {netid}"
    })
```

### Frontend Integration

The frontend can check authentication status by calling:

```javascript
// Check if user is authenticated
fetch('http://localhost:8080/api/six_degrees/check_auth/')
  .then(res => res.json())
  .then(data => {
    if (data.authenticated) {
      console.log('User:', data.username);
    } else {
      // Redirect to login
      window.location.href = 'http://localhost:8080/api/six_degrees/login/';
    }
  });

// Logout
fetch('http://localhost:8080/api/six_degrees/logout/')
  .then(() => {
    // User logged out
  });
```

## How It Works

1. User visits a protected endpoint or calls `/login/`
2. If not authenticated, user is redirected to Princeton CAS login
3. After successful login, CAS redirects back with a ticket
4. The ticket is validated with CAS server
5. If valid, username is stored in Django session
6. Subsequent requests check the session for authentication

## Notes

- Sessions are stored in the database (configured in `settings.py`)
- Session cookies last 24 hours by default
- In production, set `SESSION_COOKIE_SECURE = True` for HTTPS
- The CAS server URL defaults to `https://fed.princeton.edu/cas/`

