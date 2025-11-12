# Resume Generator Web App

A powerful web application that automatically generates tailored resumes based on job descriptions using AI. The app includes a Chrome extension for seamless integration with job sites.

## Features

- Chrome extension for easy job description selection
- AI-powered resume generation using GPT
- Professional resume formatting
- PDF and DOCX download options
- Modern, responsive web interface
- Real-time resume preview

## Tech Stack

- Frontend: React (Vite) + Chakra UI
- Backend: Node.js + Express
- AI: OpenAI GPT API
- Chrome Extension: Manifest V3
- PDF Generation: jsPDF
- DOCX Generation: docx.js

## Project Structure

```
resume-generator/
├── chrome-extension/     # Chrome extension code
├── frontend/            # React frontend application
├── backend/             # Node.js backend server
└── README.md           # Project documentation
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Chrome browser
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with your OpenAI API key:
   ```
   OPENAI_API_KEY=your_api_key_here
   PORT=3000
   ```

4. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```
   VITE_API_URL=http://localhost:3000
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

### Chrome Extension Setup

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `chrome-extension` directory

## Usage

1. Install the Chrome extension
2. Visit any job site (LinkedIn, Indeed, etc.)
3. Select a job description
4. Click the "Generate" button that appears
5. Wait for the resume to be generated
6. Review and download your tailored resume

## Development

- Frontend runs on `http://localhost:5173`
- Backend runs on `http://localhost:3000`
- Chrome extension can be loaded in developer mode

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For support, please open an issue in the GitHub repository.