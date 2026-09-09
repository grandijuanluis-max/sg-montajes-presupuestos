import urllib.request
import urllib.error
import json

url = "https://amkkuwgatjcbiyrykuoy.supabase.co/rest/v1/clientes?select=*&limit=1"
headers = {
    "apikey": "sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ",
    "Authorization": "Bearer sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ",
}
req = urllib.request.Request(url, headers=headers)
try:
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode('utf-8'))
        if data:
            print(list(data[0].keys()))
        else:
            print("Table empty")
except urllib.error.HTTPError as e:
    print(f"HTTP Error {e.code}: {e.read().decode('utf-8')}")

