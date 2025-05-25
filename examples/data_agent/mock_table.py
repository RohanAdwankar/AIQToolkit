import httpx
import time

BASE_URL = "http://localhost:3000/api/table"
TABLE_ID = "main_table"

# 1. Add columns
columns = ["Year", "Population"]
add_columns_payload = {
    "table_id": TABLE_ID,
    "table_data": {
        "columns": columns,
        "data": []
    },
    "operation_message": f"Columns set to: {columns}"
}

# 2. Add rows
rows = [
    [2020, 331449281],
    [2019, 328239523],
    [2018, 326838199]
]
add_rows_payload = {
    "table_id": TABLE_ID,
    "table_data": {
        "columns": columns,
        "data": [
            {"Year": row[0], "Population": row[1]} for row in rows
        ]
    },
    "operation_message": f"Added {len(rows)} rows."
}

def main():
    with httpx.Client() as client:
        print("Sending add_columns request...")
        resp = client.post(BASE_URL, json=add_columns_payload)
        print("Status:", resp.status_code)
        print("Response:", resp.text)
        time.sleep(0.5)

        print("Sending add_rows request...")
        resp = client.post(BASE_URL, json=add_rows_payload)
        print("Status:", resp.status_code)
        print("Response:", resp.text)

if __name__ == "__main__":
    main()
