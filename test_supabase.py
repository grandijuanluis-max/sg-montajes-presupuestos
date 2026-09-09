import requests

url = "https://amkkuwgatjcbiyrykuoy.supabase.co/rest/v1/clientes?select=*"
headers = {
    "apikey": "sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ",
    "Authorization": "Bearer sb_publishable_I5bemh3YRuiTNkMzWyCA3A_D_aqFlNJ"
}
try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    data = response.json()
    print(f"Number of clients: {len(data)}")
    if data:
        print(f"First client: {data[0]}")
except Exception as e:
    print(f"Error: {e}")
