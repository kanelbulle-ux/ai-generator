const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'AI Generator service is running' });
});

// Generate content endpoint
app.post('/generate', async (req, res) => {
  try {
    const { prompt, brand_context, constraints } = req.body;
    
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const systemPrompt = `You are a web developer creating HTML content for a website.

BRAND CONTEXT:
${brand_context || 'Modern, clean, professional design'}

CONSTRAINTS:
- Generate HTML structure only, no <style> tags
- Use Tailwind CSS classes
- Create semantic, accessible HTML
- Focus on conversion-oriented copy
- Generate only main content area (no header/footer)

${constraints || ''}`;

    const completion = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 50000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        { role: "user", content: prompt }
      ]
    });

    const generatedHtml = completion.content[0].text;

    res.json({
      success: true,
      html: generatedHtml,
      prompt: prompt,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('AI Generation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Refine content endpoint (for back-and-forth)
app.post('/refine', async (req, res) => {
  try {
    const { current_html, refinement_request } = req.body;
    
    const Anthropic = require('@anthropic-ai/sdk');
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });

    const completion = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2000,
      temperature: 0.7,
      system: "You are refining HTML content. Keep the same structure but modify based on the user's request. Return only the updated HTML.",
      messages: [
        { 
          role: "user", 
          content: `Current HTML:\n${current_html}\n\nPlease modify it to: ${refinement_request}` 
        }
      ]
    });

    res.json({
      success: true,
      html: completion.content[0].text,
      refinement: refinement_request,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Refinement Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(port, '0.0.0.0', () => {
  console.log(`AI Generator service running on port ${port}`);
});