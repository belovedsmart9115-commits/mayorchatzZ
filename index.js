const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// FREE AI CHAT - NO API KEY NEEDED!
app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.json({ reply: "Boss talk something na! 😅" });

  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(message)}?model=openai&system=You are MayorChatZ, friendly AI assistant created by Mayor. Be helpful and playful.`;
    const response = await fetch(url);
    const text = await response.text();
    res.json({ reply: text });
  } catch (err) {
    res.json({ reply: `Boss I hear you: "${message}". Network slow small, but I dey here! 🔥` });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`MayorChatZ live on ${PORT}`));
