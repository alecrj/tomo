# Whisper Backend Setup Guide

**Purpose:** Backend server that transcribes audio files using OpenAI's Whisper API.

**Why needed:** React Native can't directly call Whisper API (needs server-side FormData handling).

**Cost:** ~$0.006 per minute of audio (essentially free for travel use case)

---

## Option 1: Railway Deploy (Recommended - Easiest)

### Step 1: Create Backend Repo

```bash
# Create new directory
mkdir tomo-whisper-backend
cd tomo-whisper-backend

# Initialize npm
npm init -y

# Install dependencies
npm install express multer form-data axios cors
```

### Step 2: Create server.js

```javascript
const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const axios = require('axios');
const cors = require('cors');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

// Enable CORS for Expo app
app.use(cors());

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'tomo-whisper' });
});

// Transcription endpoint
app.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Create FormData for Whisper API
    const formData = new FormData();
    formData.append('file', req.file.buffer, {
      filename: 'audio.m4a',
      contentType: 'audio/m4a',
    });
    formData.append('model', 'whisper-1');
    formData.append('language', 'en'); // Optional: auto-detect if omitted

    // Call OpenAI Whisper API
    const response = await axios.post(
      'https://api.openai.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          ...formData.getHeaders(),
        },
      }
    );

    // Return transcription
    res.json({ text: response.data.text });
  } catch (error) {
    console.error('Transcription error:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Transcription failed',
      details: error.response?.data || error.message,
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Whisper backend listening on port ${PORT}`);
});
```

### Step 3: Update package.json

```json
{
  "name": "tomo-whisper-backend",
  "version": "1.0.0",
  "description": "Whisper transcription backend for Tomo",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "multer": "^1.4.5-lts.1",
    "form-data": "^4.0.0",
    "axios": "^1.6.2",
    "cors": "^2.8.5"
  },
  "engines": {
    "node": "18.x"
  }
}
```

### Step 4: Deploy to Railway

1. Go to https://railway.app (sign up/login with GitHub)
2. Click "New Project" → "Empty Project"
3. Click "New" → "GitHub Repo"
4. Select your `tomo-whisper-backend` repo
5. Railway auto-detects Node.js and deploys

6. Set environment variable:
   - Go to project → Variables
   - Add: `OPENAI_API_KEY` = your OpenAI API key

7. Get your URL:
   - Go to Settings → Domains
   - Railway provides: `your-app.up.railway.app`
   - Copy this URL

### Step 5: Update Tomo App

In `/Users/alec/Desktop/tomo/.env`:

```bash
EXPO_PUBLIC_WHISPER_BACKEND_URL=https://your-app.up.railway.app
```

In `/Users/alec/Desktop/tomo/services/voice.ts`:

```typescript
export async function transcribeAudio(audioUri: string): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const backendUrl = process.env.EXPO_PUBLIC_WHISPER_BACKEND_URL || 'http://localhost:3000';
    const response = await fetch(`${backendUrl}/transcribe`, {
      method: 'POST',
      body: formData,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.ok) {
      throw new Error(`Transcription failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[Voice] Transcription:', data.text);
    return data.text;
  } catch (error) {
    console.error('[Voice] Transcription error:', error);
    return null;
  }
}
```

### Step 6: Test

```bash
# In tomo directory
npx expo start

# In app:
# 1. Hold mic button
# 2. Say something
# 3. Release
# 4. Check logs for transcription
```

---

## Option 2: Vercel Deploy (Alternative)

Same code, but deploy to Vercel instead.

### Create vercel.json

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

### Deploy

```bash
npm install -g vercel
vercel login
vercel

# Follow prompts
# Set OPENAI_API_KEY in Vercel dashboard → Settings → Environment Variables
```

---

## Option 3: Local Development

For testing without deploying:

```bash
# In tomo-whisper-backend
node server.js

# In .env
EXPO_PUBLIC_WHISPER_BACKEND_URL=http://localhost:3000

# Use Expo tunnel mode to access localhost from phone
npx expo start --tunnel
```

**Note:** Tunnel mode is slow, deploy to Railway for real testing.

---

## Cost Breakdown

**OpenAI Whisper API Pricing:**
- $0.006 per minute of audio

**Example usage:**
- 100 voice messages per day
- Average 10 seconds each
- = 1,000 seconds = 16.7 minutes per day
- Cost: $0.10 per day = $3/month

**For a typical traveler:**
- 20 voice messages per day
- Average 5 seconds each
- = 100 seconds = 1.67 minutes per day
- Cost: $0.01 per day = $0.30/month

**Negligible.**

---

## Monitoring

Railway provides:
- Real-time logs
- Deployment history
- Metrics (requests, errors)
- Auto-scaling (upgrade if needed)

Free tier includes:
- 500 hours/month
- More than enough for MVP

---

## Security

1. **CORS**: Configured to allow requests from Expo app
2. **API Key**: Stored as environment variable (not in code)
3. **File validation**: Only accepts audio files
4. **Error handling**: Doesn't leak sensitive info
5. **Rate limiting**: Add if needed (express-rate-limit)

---

## Troubleshooting

### Error: "No audio file provided"
- Check that FormData is constructed correctly in voice.ts
- Verify `uri` field points to valid audio file

### Error: "Transcription failed"
- Check OPENAI_API_KEY is set correctly
- Check Railway logs for detailed error
- Verify audio file format (m4a)

### Error: "Network request failed"
- Check EXPO_PUBLIC_WHISPER_BACKEND_URL is correct
- Verify Railway app is running (check dashboard)
- Test endpoint with curl:

```bash
curl https://your-app.up.railway.app/
# Should return: {"status":"ok","service":"tomo-whisper"}
```

### Slow transcription
- Whisper typically takes 2-5 seconds
- Check Railway region (closer = faster)
- Consider upgrading Railway plan for faster CPU

---

## Alternative: On-Device Transcription

If you want to avoid backend entirely:

**expo-speech-recognition** (iOS only, less accurate):

```bash
npx expo install expo-speech-recognition
```

```typescript
import * as SpeechRecognition from 'expo-speech-recognition';

export async function transcribeAudio(audioUri: string): Promise<string | null> {
  // This would require re-architecting to use live recognition
  // Instead of recording then transcribing
  // Not recommended - Whisper is much better
}
```

**react-native-whisper** (experimental, on-device):

```bash
npm install react-native-whisper
```

Issues:
- Still early/buggy
- Large model size (~1GB)
- Slower on older phones
- Requires native module setup

**Recommendation: Use backend with Whisper API. It's $3/month and just works.**

---

## Completion Checklist

- [ ] Create tomo-whisper-backend repo
- [ ] Add server.js with transcription endpoint
- [ ] Deploy to Railway
- [ ] Set OPENAI_API_KEY env var
- [ ] Get Railway URL
- [ ] Add EXPO_PUBLIC_WHISPER_BACKEND_URL to Tomo .env
- [ ] Update services/voice.ts with fetch call
- [ ] Test: Record → Transcribe → Send to chat
- [ ] Verify transcription appears correctly
- [ ] Check Railway logs for errors

**Once complete, voice input will be fully functional!**
