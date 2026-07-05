# Discharge+ Backend

## Setup

```bash
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
cp .env.example .env  # Fill in your values
uvicorn main:app --reload --port 8000
```
