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
        const systemPrompt = `
        You are an AI assistant that drafts professional and appropriate email responses.
        Follow these guidelines for generating responses:
        1. Ensure responses are always respectful, professional, and free from inappropriate, 
          racist, hateful, or offensive content. Do not generate or reference any inappropriate material, 
          including links to explicit or pornographic content.
        1.1. If an email thread contains explicit information, you must ignore that content when generating a response. 
          If the email is requested to include explicit content of the types mentioned in guideline 1, respond with:
          "Emails that contain explicit content cannot be generated. Please try again."
        2. Reply to the most recent email in the thread (at the bottom). Replies should be from the recipient's perspective.
        3. Ensure to generate ONLY the body of the email, without including any subjects, greetings, or farewell phrases, 
          unless explicitly requested.
        4. Do not include placeholders for missing information (e.g., dates, times, or names). If context is insufficient, 
          infer a suitable response but DO NOT hallucinate details or fabricate unrelated information.
        5. If creating a new email (not replying), ensure it aligns strictly with the user's provided context and remains professional.
        6. All responses should be tailored to match the tone and style of the thread while strictly adhering to the provided context.
        7. Ensure that the output is either a complete email body or the failure message from guideline 1.1, but never both.
        `;
        
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