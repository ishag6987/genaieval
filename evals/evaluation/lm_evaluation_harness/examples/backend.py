from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import subprocess
import os

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Replace with your frontend URL if different
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount the 'static' directory
app.mount("/static", StaticFiles(directory="static"), name="static")

class EvaluationRequest(BaseModel):
    model: str
    dataset: str
    batchSize: int

@app.get("/tasks.html")
async def get_tasks_html():
    file_path = "static/tasks.html"
    if os.path.exists(file_path):
        return FileResponse(file_path)
    raise HTTPException(status_code=404, detail="File not found")

@app.post("/evaluate")
async def evaluate(request: EvaluationRequest):
    async def run_evaluation():
        command = [
            "python", "main.py",
            "--model", "gaudi-hf",
            "--model_args", f"pretrained={request.model}",
            "--tasks", request.dataset.lower(),
            "--device", "hpu",
            "--batch_size", str(request.batchSize)
        ]
        
        yield f"Executing command: {' '.join(command)}\n\n"
        
        process = subprocess.Popen(
            command,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        while True:
            output = process.stdout.readline()
            error = process.stderr.readline()
            if output == '' and error == '' and process.poll() is not None:
                break
            if output:
                yield f"OUTPUT: {output.strip()}\n"
            if error:
                yield f"ERROR: {error.strip()}\n"
        
        return_code = process.poll()
        if return_code:
            yield f"\nProcess exited with return code {return_code}\n"
            error_output = process.stderr.read()
            if error_output:
                yield f"Error details:\n{error_output}\n"

    return StreamingResponse(run_evaluation(), media_type="text/plain")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)