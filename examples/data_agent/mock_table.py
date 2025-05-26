from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse, JSONResponse
import asyncio
import uvicorn

app = FastAPI()

# In-memory table state
state = {
    "columns": [],
    "data": []
}

@app.post("/api/table")
async def table_endpoint(payload: dict):
    table_data = payload.get("table_data", {})
    columns = table_data.get("columns", [])
    data = table_data.get("data", [])
    if columns:
        state["columns"] = columns
    if data:
        state["data"].extend(data)
    return JSONResponse({
        "status": "success",
        "table_state": state,
        "operation_message": payload.get("operation_message", "")
    })

async def ai_thoughts_stream():
    # Stream thoughts as SSE events, matching the frontend's expected format
    thoughts = [
        "data: Thinking about the data sources...\n\n",
        "data: Found a relevant article: https://www.census.gov/data.html\n\n",
        "data: Extracting population numbers from [Wikipedia](https://en.wikipedia.org/wiki/Demographics_of_the_United_States)...\n\n",
        "data: Compiling the table for you now.\n\n",
        "data: Done! Table ready. See [US Census QuickFacts](https://www.census.gov/quickfacts/fact/table/US/PST045223)\n\n"
    ]
    for thought in thoughts:
        yield thought
        await asyncio.sleep(1)

@app.post("/generate/full")
async def generate_full(request: Request):
    # Start background task to update the table as if the AI is working
    async def update_table():
        import httpx
        import time
        BASE_URL = "http://localhost:3000/api/table"
        columns = ["Year", "Population"]
        add_columns_payload = {
            "table_id": "main_table",
            "table_data": {
                "columns": columns,
                "data": []
            },
            "operation_message": f"Columns set to: {columns}"
        }
        rows = [
            [2020, 331449281],
            [2019, 328239523],
            [2018, 326838199]
        ]
        add_rows_payload = {
            "table_id": "main_table",
            "table_data": {
                "columns": columns,
                "data": [
                    {"Year": row[0], "Population": row[1]} for row in rows
                ]
            },
            "operation_message": f"Added {len(rows)} rows."
        }
        async with httpx.AsyncClient() as client:
            await asyncio.sleep(2)  # Simulate AI thinking before updating columns
            await client.post(BASE_URL, json=add_columns_payload)
            await asyncio.sleep(2)  # Simulate AI thinking before updating rows
            await client.post(BASE_URL, json=add_rows_payload)
    # Launch the background task
    asyncio.create_task(update_table())
    return StreamingResponse(ai_thoughts_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    uvicorn.run("mock_table:app", host="127.0.0.1", port=8000, reload=True)
