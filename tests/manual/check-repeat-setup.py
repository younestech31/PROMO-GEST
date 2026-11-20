"""One operator-triggered repeat-setup check on an already initialized disposable kit."""
import getpass
import http.client
import json
import re
import secrets
import sys
from http.cookies import SimpleCookie


def main():
    if not sys.stdin.isatty():
        sys.exit('Use an interactive terminal; do not pipe credentials.')
    port = int(input('Current kit port: ').strip())
    if not 1 <= port <= 65535:
        sys.exit('Invalid port')
    # Direct loopback only: no proxy, URL supplied by user, redirects, or cookie files.
    conn = http.client.HTTPConnection('127.0.0.1', port, timeout=10)
    conn.request('GET', '/api/setup/status')
    response = conn.getresponse()
    if response.status != 200:
        sys.exit('Setup status unavailable; no POST sent.')
    status = json.load(response)
    if status.get('isInitialized') is not True:
        sys.exit('Not initialized; no POST sent.')
    print('Initialized organization:', status.get('organizationLegalName'))
    if input('Your disposable test organization? Type YES: ').strip() != 'YES':
        sys.exit('Cancelled; no POST sent.')
    token = getpass.getpass('Current setup token (hidden): ').strip()
    if not re.fullmatch('[0-9a-f]{48}', token):
        sys.exit('Invalid kit token format; no POST sent.')
    conn.request('GET', '/api/auth/csrf')
    response = conn.getresponse()
    if response.status != 200:
        sys.exit('CSRF initialization failed; no POST sent.')
    cookies = SimpleCookie()
    for name, value in response.getheaders():
        if name.lower() == 'set-cookie':
            cookies.load(value)
    csrf = json.load(response)
    payload = dict(legalName='QA Duplicate Only', legalForm='SARL', wilayaCode='31',
                   wilayaName='Oran', address='QA test address', defaultLanguage='ar',
                   adminUsername='qa_repeat', adminFullName='QA Repeat', adminEmail='repeat@example.invalid',
                   adminPassword='Qa9!' + secrets.token_hex(16))
    conn.request('POST', '/api/setup/initialize', json.dumps(payload), {
        'Content-Type': 'application/json', csrf['headerName']: csrf['token'],
        'Cookie': '; '.join(c.OutputString(attrs=[]) for c in cookies.values()),
        'X-PROMOGEST-SETUP-TOKEN': token,
    })
    response = conn.getresponse()
    if response.status == 409 and json.load(response).get('code') == 'SETUP_ALREADY_INITIALIZED':
        print('HTTP 409 SETUP_ALREADY_INITIALIZED')
    else:
        sys.exit(f'Unexpected HTTP {response.status}. Stop and check counts; do not retry.')


if __name__ == '__main__':
    try:
        main()
    except (ValueError, KeyError, OSError, http.client.HTTPException):
        sys.exit('Check the kit port and status. No automatic retry.')
