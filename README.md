# MyLamaJS: Building Cool Node.js and Express Apps with AI

Welcome, junior developers! This guide will teach you how to use MyLamaJS, a powerful wrapper for interacting with AI models like those from Ollama. We'll cover the basics, build some cool apps, and dive into a fun tutorial on creating an AI agent with personality and a toolbox for saving memos.

## What is MyLamaJS?

MyLamaJS is a Node.js library that simplifies communication with AI models hosted on servers like Ollama. It handles HTTP requests, streaming responses, and configuration, so you can focus on building awesome apps without worrying about the low-level details.

Key features:
- Synchronous and asynchronous requests
- Streaming support for real-time responses
- Easy configuration via JSON files
- Compatible with Express for web apps

## Installation and Setup

First, make sure you have Node.js installed (version 14+ recommended). Then, install MyLamaJS:

```bash
npm install mylamajs
```

You'll also need an AI model server like Ollama running. Download Ollama from [ollama.ai](https://ollama.ai) and pull a model:

```bash
ollama pull llama3  # or any other model
```

Create a config file `mylamajs.config.json`:

```json
{
  "baseURL": "http://localhost:11434",
  "endpoint": "/api/generate",
  "timeoutMs": 60000,
  "models": ["llama3", "mistral"]
}
```

## Basic Usage

### Importing and Initializing

```javascript
const MyLamaJS = require('mylamajs');

const lama = new MyLamaJS({ configPath: './mylamajs.config.json' });
```

### Making a Simple Request

```javascript
async function getResponse() {
  const response = await lama.getResponse('llama3', 'Hello, world!', 100, false);
  console.log(response);
}

getResponse();
```

- `getResponse(model, prompt, maxTokens, stream)`: Generates a response.
  - `model`: The AI model name.
  - `prompt`: Your input text.
  - `maxTokens`: Maximum response length.
  - `stream`: Boolean for streaming (true for real-time output).

### Streaming Example

```javascript
async function streamResponse() {
  for await (const chunk of lama.getResponse('llama3', 'Tell me a story', 200, true)) {
    process.stdout.write(chunk);
  }
}

streamResponse();
```

## Building Cool Node.js Apps

### Simple Chatbot

Create a basic chatbot that responds to user input.

```javascript
const readline = require('readline');
const MyLamaJS = require('mylamajs');

const lama = new MyLamaJS({ configPath: './mylamajs.config.json' });
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function askQuestion() {
  rl.question('You: ', async (input) => {
    if (input.toLowerCase() === 'exit') return rl.close();
    const response = await lama.getResponse('llama3', input, 150, false);
    console.log('Bot:', response);
    askQuestion();
  });
}

askQuestion();
```

### Integrating with Express

Build a web app where users can chat with the AI.

First, install Express:

```bash
npm install express
```

```javascript
const express = require('express');
const MyLamaJS = require('mylamajs');

const app = express();
const lama = new MyLamaJS({ configPath: './mylamajs.config.json' });

app.use(express.json());

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  const response = await lama.getResponse('llama3', message, 200, false);
  res.json({ reply: response });
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

Frontend (simple HTML):

```html
<!DOCTYPE html>
<html>
<body>
  <input id="input" placeholder="Type a message">
  <button onclick="sendMessage()">Send</button>
  <div id="chat"></div>

  <script>
    async function sendMessage() {
      const message = document.getElementById('input').value;
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const data = await response.json();
      document.getElementById('chat').innerHTML += `<p>You: ${message}</p><p>Bot: ${data.reply}</p>`;
    }
  </script>
</body>
</html>
```

## Tutorial: Creating an AI Agent with Personality and Memo Toolbox

Let's build an AI agent named "Zara" – a quirky, helpful assistant who can save memos for users. Zara has a personality (funny and sarcastic) and a toolbox (memo-saving feature).

### Step 1: Set Up the Project

Create a new directory and initialize:

```bash
mkdir zara-agent
cd zara-agent
npm init -y
npm install express mylamajs
```

Create `mylamajs.config.json` as before.

### Step 2: Define Zara's Personality and Toolbox

We'll use MyLamaJS for responses and add custom logic for memos.

```javascript
const express = require('express');
const MyLamaJS = require('mylamajs');
const fs = require('fs');

const app = express();
const lama = new MyLamaJS({ configPath: './mylamajs.config.json' });

app.use(express.json());

// Memo storage (simple file-based for demo)
const memos = JSON.parse(fs.readFileSync('memos.json', 'utf8') || '[]');

function saveMemo(user, content) {
  memos.push({ user, content, date: new Date().toISOString() });
  fs.writeFileSync('memos.json', JSON.stringify(memos, null, 2));
}

function getMemos(user) {
  return memos.filter(m => m.user === user);
}

// Zara's personality prompt
const personalityPrompt = `
You are Zara, a quirky AI assistant. You're funny, sarcastic, and always helpful. 
Respond in a witty way, but be kind. If the user asks to save a memo, acknowledge it and use the toolbox.
User message: {message}
`;

app.post('/chat', async (req, res) => {
  const { message, user } = req.body;
  
  // Check for memo commands
  if (message.toLowerCase().includes('save memo')) {
    const memoContent = message.replace(/save memo/i, '').trim();
    saveMemo(user, memoContent);
    return res.json({ reply: "Memo saved! I'll remember that for you. 😎" });
  }
  
  if (message.toLowerCase().includes('show memos')) {
    const userMemos = getMemos(user);
    const reply = userMemos.length ? userMemos.map(m => `${m.date}: ${m.content}`).join('\n') : "No memos yet!";
    return res.json({ reply });
  }
  
  // Generate response with personality
  const prompt = personalityPrompt.replace('{message}', message);
  const response = await lama.getResponse('llama3', prompt, 200, false);
  res.json({ reply: response });
});

app.listen(3000, () => console.log('Zara is listening on port 3000'));
```

### Step 3: Test Zara

Run the server:

```bash
node app.js
```

Use curl or a tool like Postman:

```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"message": "Hello Zara!", "user": "alice"}'
```

Try saving a memo:

```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"message": "Save memo: Buy groceries", "user": "alice"}'
```

And retrieving:

```bash
curl -X POST http://localhost:3000/chat -H "Content-Type: application/json" -d '{"message": "Show memos", "user": "alice"}'
```

### Step 4: Enhance Zara

- Add more toolbox features (e.g., reminders, calculations).
- Integrate with a database for persistent memos.
- Add streaming for real-time responses.
- Create a web interface for easier interaction.

## Best Practices

- Handle errors gracefully with try-catch.
- Use environment variables for sensitive config.
- Limit request rates to avoid overloading the AI server.
- Test your apps thoroughly.

Now you're ready to build amazing AI-powered apps with MyLamaJS! Experiment, have fun, and remember: with great power comes great responsibility (and lots of debugging). 🚀</content>
<parameter name="filePath">c:\Users\codem\Desktop\MyLamaJS\MyLamaJS.md
