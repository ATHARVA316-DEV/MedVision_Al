import urllib.request
import json

url = "http://127.0.0.1:5000/api/predict/diabetes"

payload_low = {
    "pregnancies": 1,
    "glucose": 90,
    "blood_pressure": 70,
    "skin_thickness": 20,
    "insulin": 50,
    "bmi": 22,
    "diabetes_pedigree": 0.2,
    "age": 25
}

payload_high = {
    "pregnancies": 8,
    "glucose": 180,
    "blood_pressure": 95,
    "skin_thickness": 40,
    "insulin": 300,
    "bmi": 38,
    "diabetes_pedigree": 1.2,
    "age": 55
}

def test_payload(label, payload):
    print(f"Testing {label} risk...")
    try:
        req = urllib.request.Request(url, data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as f:
            response_data = f.read().decode()
            print(f"Status Code: {f.getcode()}")
            print(f"Response: {json.dumps(json.loads(response_data), indent=2)}")
    except Exception as e:
        print(f"Error: {e}")
    print("-" * 40)

test_payload("Low", payload_low)
test_payload("High", payload_high)
