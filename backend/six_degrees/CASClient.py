# ----------------------------------------------------------------------
# CASClient.py
# Authors: Alex Halderman, Scott Karlin, Brian Kernighan, Bob Dondero
# Adapted for Django by: [Your Name]
# ----------------------------------------------------------------------

from urllib.request import urlopen
from urllib.parse import quote
from re import sub
from django.http import HttpResponseRedirect, HttpResponse
from django.shortcuts import redirect


class CASRedirectRequired(Exception):
    """
    Custom exception to indicate that a redirect to CAS login is required.
    This exception contains the redirect URL.
    """
    def __init__(self, redirect_url):
        self.redirect_url = redirect_url
        super().__init__(f"CAS redirect required to: {redirect_url}")


class CASClient:
    """
    Django-compatible CAS (Central Authentication Service) client
    for Princeton University authentication.
    """
    
    def __init__(self, request, url='https://fed.princeton.edu/cas/'):
        """
        Initialize a new CASClient object so it uses the given CAS
        server, or fed.princeton.edu if no server is given.
        
        Args:
            request: Django HttpRequest object
            url: CAS server URL (defaults to Princeton's CAS server)
        """
        self.request = request
        self.cas_url = url

    def stripTicket(self):
        """
        Return the URL of the current request after stripping out the
        "ticket" parameter added by the CAS server.
        """
        url = self.request.build_absolute_uri()
        if url is None:
            return 'something is badly wrong'
        url = sub(r'ticket=[^&]*&?', '', url)
        url = sub(r'\?&?$|&$', '', url)
        return url

    def is_logged_in(self):
        """Return True if user is logged in"""
        return 'username' in self.request.session

    def validate(self, ticket):
        """
        Validate a login ticket by contacting the CAS server. If
        valid, return the user's username; otherwise, return None.
        """
        val_url = self.cas_url + 'validate' + \
            '?service=' + quote(self.stripTicket()) + \
            '&ticket=' + quote(ticket)
        try:
            r = urlopen(val_url).readlines()   # returns 2 lines
            if len(r) != 2:
                return None
            firstLine = r[0].decode('utf-8').strip()
            secondLine = r[1].decode('utf-8').strip()
            if not firstLine.startswith('yes'):
                return None
            return secondLine
        except Exception as e:
            print(f"CAS validation error: {e}")
            return None

    def authenticate(self):
        """
        Authenticate the remote user, and return the user's username.
        Do not return unless the user is successfully authenticated.
        Raises CASRedirectRequired if authentication is needed.
        """
        # If the user's username is in the session, then the user was
        # authenticated previously. So return the user's username.
        if 'username' in self.request.session:
            return self.request.session.get('username')

        # If the request contains a login ticket, then try to
        # validate it.
        ticket = self.request.GET.get('ticket')
        if ticket is not None:
            username = self.validate(ticket)
            if username is not None:
                # The user is authenticated, so store the user's
                # username in the session.
                self.request.session['username'] = username
                return username

        # The request does not contain a valid login ticket, so
        # redirect the browser to the login page to get one.
        login_url = self.cas_url + 'login' + \
            '?service=' + quote(self.stripTicket())
        
        raise CASRedirectRequired(login_url)

    def logout(self, redirect_url=None):
        """
        Logout the user and redirect to CAS logout page.
        
        Args:
            redirect_url: Optional URL to redirect to after logout.
                         If not provided, redirects to CAS logout page.
        """
        if 'username' in self.request.session:
            # Delete the user's username from the session.
            self.request.session.pop('username')
        
        # Redirect to CAS logout page, or to specified redirect URL
        if redirect_url:
            logout_url = self.cas_url + 'logout' + '?service=' + quote(redirect_url)
        else:
            logout_url = self.cas_url + 'logout'
        
        raise CASRedirectRequired(logout_url)


# -----------------------------------------------------------------------

def main():
    print('CASClient does not run standalone')


if __name__ == '__main__':
    main()

