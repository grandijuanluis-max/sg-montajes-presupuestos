import urllib.request
import json

url = "https://amkkuwgatjcbiyrykuoy.supabase.co/rest/v1/clientes?select=*"
headers = {
    "apikey": "sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ",
    "Authorization": "Bearer sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ"
}

req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode())
        print(f"Number of clients: {len(data)}")
except Exception as e:
    print(f"Error: {e}")
