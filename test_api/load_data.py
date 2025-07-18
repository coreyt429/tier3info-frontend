import random
import string
import requests



template = {
    "taskName": "ID",
    "taskCmd": "tasks.version",
    "taskNode": "Any",
    "taskParams": "",
    "taskSchedule": "0 0 * * *",
    "taskType": "celery",
}

endpoint =  'http://localhost:8080/api/task_schedule'
def random_id(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

def random_cron():
    minute = random.randint(0, 59)
    hour = random.randint(0, 23)
    day = random.randint(1, 28)
    month = random.randint(1, 12)
    weekday = random.randint(0, 6)
    return f"{minute} {hour} {day} {month} {weekday}"

# for _ in range(10):
#     data = template.copy()
#     data["taskName"] = random_id()
#     data["taskParams"] = random_id(12)
#     data["taskSchedule"] = random_cron()
#     url = f"{endpoint}/{data['taskName']}"
#     response = requests.put(url, json=data)
#     print(f"PUT {url} - Status: {response.status_code}")

# data = {
#     "alias": "test.com",
#     "certificate_id": "STAR.test.com_20260101",
#     "data": {
#         "subject": "*test.com",
#         "issuer": "Test CA",
#         "expiration_date": "2026-01-01",
#         "serial_number": "1234567890",
#         "san": ["test.com", "*.test.com"],
#     }
# }
# endpoint =  'http://localhost:8080/api/broadworks/certificates'
# url = f"{endpoint}/{data['certificate_id']}"
# response = requests.put(url, json=data)
# print(f"PUT {url} - Status: {response.status_code}")


data = [
    {
        "link": '/#/certificates',
        "title": "Broadworks Certificates",
        "icon": "build",
        "parent": None
    }
]
endpoint =  'http://localhost:8080/api/menu/user'
url = f"{endpoint}"
response = requests.put(url, json=data)
print(f"PUT {url} - Status: {response.status_code}")
