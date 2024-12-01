// background.js

// Listen for messages from the content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateAIResponse') {
    (async () => {
      try {
        // Check if the Prompt API is available
        if (!('aiOriginTrial' in chrome)) {
          sendResponse({ error: 'Error: chrome.aiOriginTrial not supported in this browser' });
          return;
        }

        // Check if the language model is available
        const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();

        if (capabilities.available === 'no') {
          sendResponse({ error: 'Prompt API is not available.' });
          return;
        } else if (capabilities.available === 'after-download') {
          // Trigger model download and monitor progress
          await chrome.aiOriginTrial.languageModel.create({
            monitor(m) {
              m.addEventListener('downloadprogress', (e) => {
                console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
              });
            },
          });
        }

        // Initialize session with a system prompt
        const systemPrompt =
          'You are an AI assistant that helps users write professional and appropriate email responses. Read the email thread and generate a suitable response ONLY the body of the response nothing else and NO placeholders for information. The bottom email is the most recent and the one you are replying to.';
        const session = await chrome.aiOriginTrial.languageModel.create({
          systemPrompt: systemPrompt,
        });

        // Prompt the model with the email thread
        const result = await session.prompt(request.promptText);

        // Destroy the session to free resources
        session.destroy();

        sendResponse({ aiResponse: result });
      } catch (error) {
        sendResponse({ error: error.message });
      }
    })();
    return true; // Keeps the message channel open for sendResponse
  }
});