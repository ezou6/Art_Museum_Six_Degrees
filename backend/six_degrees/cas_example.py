"""
Example usage of CAS authentication in Django views.
This shows how to use CAS authentication similar to the Flask pattern.
"""

from django.http import JsonResponse, HttpResponseRedirect
from rest_framework.decorators import api_view
from .CASClient import CASClient
from .views import get_netid, cas_login_required


# Example 1: Simple authentication check (matches Flask pattern)
@api_view(['GET'])
def example_view(request):
    """
    Example showing how to get netid like in Flask:
    netid = _cas.authenticate()
    """
    cas_client = CASClient(request)
    
    try:
        # This will either return netid or redirect to CAS login
        netid = cas_client.authenticate()
        netid = netid.rstrip()  # Strip whitespace like Flask version
        
        # Now you can use netid
        return JsonResponse({
            "message": f"Hello, {netid}!",
            "netid": netid
        })
    except HttpResponseRedirect as redirect_response:
        return redirect_response


# Example 2: Using the helper function (doesn't redirect)
@api_view(['GET'])
def example_view_no_redirect(request):
    """
    Example using get_netid() helper - doesn't redirect, just checks.
    """
    netid = get_netid(request)
    
    if netid:
        netid = netid.rstrip()
        return JsonResponse({
            "authenticated": True,
            "netid": netid,
            "message": f"User {netid} is logged in"
        })
    else:
        return JsonResponse({
            "authenticated": False,
            "message": "User is not logged in"
        }, status=401)


# Example 3: Using the decorator (automatic redirect)
@cas_login_required
@api_view(['GET'])
def example_protected_view(request):
    """
    Example using @cas_login_required decorator.
    User will be automatically redirected to CAS login if not authenticated.
    """
    # At this point, user is guaranteed to be authenticated
    netid = get_netid(request)
    netid = netid.rstrip()
    
    return JsonResponse({
        "message": f"Protected content for {netid}",
        "netid": netid
    })


# Example 4: Pattern matching Flask code exactly
@api_view(['GET'])
def example_flask_pattern(request):
    """
    This matches the Flask pattern exactly:
    
    def dashboard():
        if redirect_landing():
            return redirect(url_for('landing'))
        netid = _cas.authenticate()
        netid = netid.rstrip()
        # Use netid...
    """
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

