# BigQuery Release Notes Hub

A modern, responsive web application that fetches the Google Cloud BigQuery Release Notes feed, parses individual updates, styles them into a clean timeline, and allows you to customize and share specific updates directly to X (formerly Twitter).

Built using **Python Flask** for the backend parser and **plain vanilla HTML, CSS, and JavaScript** for a premium glassmorphic frontend interface.

## Features

- **Automated Atom Parsing**: Fetches the XML feed from Google Cloud, parses entries, and segments HTML contents by category (`Feature`, `Issue`, `Deprecation`, etc.) to isolate individual updates.
- **Vibrant Glassmorphism Design**: Sleek dark-mode first UI layout, featuring container queries, custom indicators, card hover zoom effects, and micro-animations.
- **CSS-native Theme Toggle**: Smoothly switches between Dark mode and Light mode using CSS variables, persisting selection via `localStorage`.
- **Search & Filters**: Instantly filters updates in real time by keywords or release type (Features, Issues, Deprecations, and Others).
- **On-Demand Refresh**: Refresh button with an active rotation spinner fetches and updates release notes instantly from Google Cloud, cache-busting on request.
- **Smart Twitter/X Composer**: Click "Tweet this" on any individual update card to draft a post. The composer automatically truncates the update description to fit the 280-character limit alongside the official source link and date, providing live validation and click-to-share integration.

## Project Structure

```text
bq-releases-notes/
├── app.py                  # Flask Web Server & API
├── templates/
│   └── index.html          # Dashboard Template
├── static/
│   ├── css/
│   │   └── style.css       # Core design tokens, dark/light theme variables, animations
│   └── js/
│   │   └── app.js          # API calls, state management, search filters, modal controller
└── venv/                   # Python Virtual Environment
```

## Setup & Running the Application

### 1. Requirements
Ensure you have Python 3.8+ installed.

### 2. Run the App
To start the Flask development server:
```bash
# Run the application using the local virtual environment
./venv/bin/python3 app.py
```
The server will start at **`http://127.0.0.1:8080`**.

### 3. Open in Browser
Open `http://127.0.0.1:8080` in your browser to view the BigQuery Release Notes Hub!

## API Endpoints

- **`GET /`**: Renders the frontend dashboard.
- **`GET /api/releases`**: Returns JSON data of parsed release notes.
  - **Query Parameters**:
    - `refresh=true` (optional): Bypasses the in-memory cache to fetch fresh data from Google Cloud.
