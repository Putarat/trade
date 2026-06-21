# Trade Fullstack (Python + React)

A simple full-stack starter project:
- Backend: Django 3.2 (Python 3.9)
- Frontend: React + Vite
- Features: Upload image, save stock name, and pie chart summary by stock name
- Connection: Frontend calls backend via `/api` and Vite proxy

## Project structure

- `backend/config/urls.py` - API routes
- `backend/requirements.txt` - Python dependencies
- `frontend/` - React app

## Run backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python manage.py runserver 127.0.0.1:8000
```

Backend URL: `http://127.0.0.1:8000`

## Run frontend

Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Frontend URL: `http://localhost:5173`

Target versions:
- Python `3.9`
- Django `3.2.25`
- React `18.3.x`
- Node `21.x` (see `frontend/.nvmrc`)

## API endpoints

- `GET /api/health`
- `GET /api/message`
- `GET /api/stocks`
- `POST /api/stocks/upload` with form data:

- `image` (file)

Response includes:
- `extracted`: stock symbols detected from screenshot
- `summary`: pie chart aggregation by symbol

## OCR requirement (important)

Backend uses `pytesseract`, so install Tesseract OCR in Windows:

1. Install Tesseract OCR (for example from UB Mannheim build)
2. Ensure `tesseract.exe` is available in PATH
3. Restart terminal, then run backend again
