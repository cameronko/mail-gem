// contentScript.js

/**
 * GmailExtractor Class
 * Extracts email threads and generates a structured prompt from Gmail.
 */
class GmailExtractor {
  /**
   * Constructor for GmailExtractor
   * @param {number} [maxMessages=10] - The maximum number of messages to extract.
   */
  constructor(maxMessages = 10) {
    this.maxMessages = maxMessages;
  }

  /**
   * Expands all email threads in Gmail.
   * Throws an error if the operation fails.
   */
  expandAllThreads() {
    try {
      // Simply click the "Expand all" button for Gmail (if available)
      const expandAllButton = document.querySelector('[aria-label="Expand all"]');
      if (expandAllButton) {
        expandAllButton.click();
      }
    } catch (error) {
      throw new Error('Failed to expand all threads in Gmail.');
    }
  }

  /**
   * Generates a prompt containing the email thread details.
   * @returns {string} - The formatted email thread prompt.
   * @throws {Error} - If no emails are found.
   */
  getPrompt() {
    this.expandAllThreads();

    let emailThread = 'Here is an email thread to respond to:\n\n';
    const emailElements = document.querySelectorAll('div.adn.ads[data-legacy-message-id]');
    if (!emailElements.length) {
      throw new Error('No emails found in Gmail.');
    }

    for (let i = 0; i < Math.min(this.maxMessages, emailElements.length); i++) {
      // Extract sender's name and email
      let message = emailElements[i];
      let senderElement = message.querySelector('.gD');
      let senderName = senderElement?.getAttribute('name') || 'Unknown Sender';
      let senderEmail = senderElement?.getAttribute('email') || '';

      // Extract recipients
      let recipientElements = message.querySelectorAll('.g2');
      let recipients =
        Array.from(recipientElements)
          .map((el) => {
            let name = el.getAttribute('name') || '';
            let email = el.getAttribute('email') || '';
            return `${name} <${email}>`;
          })
          .join(', ') || 'Unknown Recipient';

      // Extract email body
      let bodyElement = message.querySelector('div.a3s');
      let body = bodyElement?.innerText || bodyElement?.textContent || 'No Content';

      // Build the email thread string
      emailThread += `From: ${senderName} <${senderEmail}>\nTo: ${recipients}\n\n${body}\n\n---\n\n`;
    }

    return emailThread;
  }
}

/**
 * OutlookExtractor Class
 * Extracts email threads and generates a structured prompt from Outlook.
 */
class OutlookExtractor {
  /**
   * Constructor for OutlookExtractor
   * @param {number} [maxMessages=10] - The maximum number of messages to extract.
   */
  constructor(maxMessages = 10) {
    this.maxMessages = maxMessages;
  }

  /**
   * Expands all email threads in Outlook.
   * Throws an error if the operation fails.
   */
  expandAllThreads() {
    const conversationPanel = document.querySelector('[aria-label="Reading Pane"]');
    const unexpandedMessages = conversationPanel.querySelectorAll('div[aria-expanded="false"]');
    // Click the child of each unexpanded message to expand
    unexpandedMessages.forEach((message) => message.firstChild.click());
  }

  /**
   * Generates a prompt containing the email thread details.
   * @returns {string} - The formatted email thread prompt.
   * @throws {Error} - If no emails are found.
   */
  getPrompt() {
    this.expandAllThreads();

    let emailThread = 'Here is an email thread to respond to:\n\n';
    const emailElements = document.querySelectorAll('div[aria-label="Email message"]');
    if (!emailElements.length) {
      throw new Error('No emails found in Outlook.');
    }

    for (let i = 0; i < Math.min(this.maxMessages, emailElements.length); i++) {
      const emailElement = emailElements[i];

      // Extract sender
      const fromElement = emailElement.querySelector('span[aria-label^="From: "] span.OZZZK');
      const fromName = fromElement?.textContent.trim() || 'Unknown Sender';

      // Extract recipients
      const toElement = emailElement.querySelector('div[aria-label^="To: "]');
      let recipients = 'Unknown Recipient';
      if (toElement) {
        const toElements = toElement.querySelectorAll('span.pU1YL');
        recipients =
          Array.from(toElements)
            .map((el) => el.textContent.trim())
            .join(', ') || 'Unknown Recipient';
      }

      // Extract email body
      const bodyElement = emailElement.querySelector('div[aria-label="Message body"]');
      const body = bodyElement?.innerText.trim() || 'No Content';

      // Build the email thread string
      emailThread += `From: ${fromName}\nTo: ${recipients}\n\n${body}\n\n---\n\n`;
    }

    return emailThread;
  }
}

/**
 * Observes URL changes to detect navigation and initializes the script.
 */
const observeUrlChange = () => {
  const bodyList = document.querySelector('body');
  const observer = new MutationObserver(function (mutations) {
    if (currentUrl !== window.location.href) {
      currentUrl = window.location.href;
      init();
    }
  });

  observer.observe(bodyList, { childList: true, subtree: true });
};

/**
 * Initializes the content script based on the detected email service.
 */
const init = () => {
  if (currentUrl.includes('mail.google.com')) {
    monitorGmailReplyBox();
  } else if (
    currentUrl.includes('outlook.office.com') ||
    currentUrl.includes('outlook.live.com') ||
    currentUrl.includes('outlook.office365.com')
  ) {
    monitorOutlookReplyBox();
  }
};

/**
 * Monitors the DOM for the appearance of Gmail's reply box and inserts the AI button.
 */
const monitorGmailReplyBox = () => {
  // Observe mutations in the body subtree
  const observer = new MutationObserver(() => {
    const replyBox = document.querySelector('div[aria-label="Message Body"]');
    if (replyBox && !replyBox.dataset.aiButtonInjected) {
      insertAIButtonGmail(replyBox);
      replyBox.dataset.aiButtonInjected = 'true';
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Check for the reply box on initial load
  const replyBox = document.querySelector('div[aria-label="Message Body"]');
  if (replyBox && !replyBox.dataset.aiButtonInjected) {
    insertAIButtonGmail(replyBox);
    replyBox.dataset.aiButtonInjected = 'true';
  }
};

/**
 * Inserts the AI button into Gmail's reply box.
 */
const insertAIButtonGmail = (replyBox) => {
  if (!replyBox) return;

  // Avoid inserting multiple buttons
  if (replyBox.parentElement.querySelector('#mailgem-ai-button')) return;

  // Create the AI button
  const aiButton = document.createElement('button');
  aiButton.id = 'mailgem-ai-button';
  aiButton.title = 'Generate AI Response';

  // Set the initial style properties
  aiButton.style.width = '40px';
  aiButton.style.height = '40px';
  aiButton.style.borderRadius = '50%';
  aiButton.style.border = 'none';
  aiButton.style.cursor = 'pointer';
  aiButton.style.transition = 'width 0.3s, height 0.3s, border-radius 0.3s';
  aiButton.style.boxShadow = '0px 2px 5px rgba(0,0,0,0.3)';
  aiButton.style.zIndex = '9999';

  // Set the initial icon as the background image
  const iconURL = chrome.runtime.getURL('icons/icon48.png');
  aiButton.style.backgroundImage = `url('${iconURL}')`;
  aiButton.style.backgroundSize = 'contain';
  aiButton.style.backgroundRepeat = 'no-repeat';
  aiButton.style.backgroundPosition = 'center';

  // Get the replyBox element's container
  let container = replyBox.parentElement;
  if (!container) {
    console.error('Reply box container not found');
    container = document.body;
  }

  // Position the button appropriately
  aiButton.style.position = 'absolute';
  aiButton.style.right = '50px';
  aiButton.style.bottom = '10px';

  // Append the button to the reply box container
  container.style.position = 'relative';
  container.appendChild(aiButton);

  // Handle mouse hover to transform the button into a dialog box
  aiButton.addEventListener('mouseover', () => {
    aiButton.style.width = '300px';
    aiButton.style.height = '200px';
    aiButton.style.borderRadius = '10px';

    // Clear the button content when expanding it into a dialog box
    aiButton.innerHTML = '';

    // Set up a layout for the dialog box
    aiButton.style.display = 'flex';
    aiButton.style.flexDirection = 'column';
    aiButton.style.padding = '10px';
    aiButton.style.justifyContent = 'space-between';
    aiButton.style.alignItems = 'center';

    // Create the text area
    const popupTextarea = document.createElement('textarea');
    popupTextarea.value = '';
    popupTextarea.placeholder = 'Type Context Here!';
    popupTextarea.style.width = '100%';
    popupTextarea.style.height = '120px';
    popupTextarea.style.resize = 'none';
    popupTextarea.style.marginBottom = '10px';

    // Create the Generate button
    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate';
    generateButton.style.width = '100%';
    generateButton.style.height = '30px';
    generateButton.style.cursor = 'pointer';
    generateButton.style.border = 'none';
    generateButton.style.backgroundColor = '#4CAF50';
    generateButton.style.color = '#fff';
    generateButton.style.borderRadius = '5px';
    generateButton.style.fontSize = '14px';

    // Append the elements to the button (now acting as the dialog)
    aiButton.appendChild(popupTextarea);
    aiButton.appendChild(generateButton);

    // Event listener for Generate button
    generateButton.addEventListener('click', async () => {
      aiButton.disabled = true;
      aiButton.style.opacity = '0.5';
      try {
        const extractor = new GmailExtractor();
        const promptText = extractor.getPrompt();

        // Send the prompt to the background script
        chrome.runtime.sendMessage(
          { action: 'generateAIResponse', promptText: promptText },
          (response) => {
            if (response.error) {
              alert(response.error);
            } else {
              // Insert the AI response into the reply box
              insertTextAtCursor(replyBox, response.aiResponse);
            }
            aiButton.disabled = false;
            aiButton.style.opacity = '1';
          }
        );
      } catch (error) {
        alert(error.message);
        aiButton.disabled = false;
        aiButton.style.opacity = '1';
      }
    });
  });

  // Handle mouse leave to revert back to the original button
  aiButton.addEventListener('mouseleave', () => {
    aiButton.style.width = '40px';
    aiButton.style.height = '40px';
    aiButton.style.borderRadius = '50%';
    aiButton.style.display = '';

    // Add transition to smoothly revert back
    aiButton.style.transition = 'width 0.3s, height 0.3s, border-radius 0.3s';

    // Remove the popup content
    setTimeout(() => {
      aiButton.innerHTML = '';
      aiButton.style.backgroundImage = `url('${iconURL}')`;
    }, 300);
  });
};

/**
 * Monitors the DOM for the appearance of Outlook's reply box and inserts the AI button.
 */
const monitorOutlookReplyBox = () => {
  // Observe mutations in the body subtree
  const observer = new MutationObserver(() => {
    const replyBox = document.querySelector(
      '[role="textbox"][aria-label^="Message body"][contenteditable="true"]'
    );
    if (replyBox && !replyBox.dataset.aiButtonInjected) {
      insertAIButtonOutlook(replyBox);
      replyBox.dataset.aiButtonInjected = 'true';
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Check for the reply box on initial load
  const replyBox = document.querySelector(
    '[role="textbox"][aria-label^="Message body"][contenteditable="true"]'
  );
  if (replyBox && !replyBox.dataset.aiButtonInjected) {
    insertAIButtonOutlook(replyBox);
    replyBox.dataset.aiButtonInjected = 'true';
  }
};

/**
 * Inserts the AI button into Outlook's reply box.
 */
const insertAIButtonOutlook = (replyBox) => {
  if (!replyBox) return;

  // Avoid inserting multiple buttons
  if (replyBox.parentElement.querySelector('#mailgem-ai-button')) return;

  // Create the AI button
  const aiButton = document.createElement('button');
  aiButton.id = 'mailgem-ai-button';
  aiButton.title = 'Generate AI Response';
  aiButton.style.width = '40px';
  aiButton.style.height = '40px';
  aiButton.style.borderRadius = '50%';
  aiButton.style.border = 'none';
  aiButton.style.cursor = 'pointer';
  aiButton.style.boxShadow = '0px 2px 5px rgba(0,0,0,0.3)';
  aiButton.style.zIndex = '9999';

  // Get the icon URL from the extension's icons folder
  const iconURL = chrome.runtime.getURL('icons/icon48.png');
  aiButton.style.backgroundImage = `url('${iconURL}')`;
  aiButton.style.backgroundSize = 'contain';
  aiButton.style.backgroundRepeat = 'no-repeat';
  aiButton.style.backgroundPosition = 'center';

  // Position the button appropriately
  aiButton.style.position = 'absolute';
  aiButton.style.right = '50px';
  aiButton.style.bottom = '10px';

  const container = replyBox.parentElement;
  if (container) {
    container.style.position = 'relative';
    container.appendChild(aiButton);
  }

  // Handle mouse hover to transform the button into a dialog box
  aiButton.addEventListener('mouseover', () => {
    aiButton.style.width = '300px';
    aiButton.style.height = '200px';
    aiButton.style.borderRadius = '10px';

    // Clear the button content when expanding it into a dialog box
    aiButton.innerHTML = '';

    // Set up a layout for the dialog box
    aiButton.style.display = 'flex';
    aiButton.style.flexDirection = 'column';
    aiButton.style.padding = '10px';
    aiButton.style.justifyContent = 'space-between';
    aiButton.style.alignItems = 'center';

    // Create the text area
    const popupTextarea = document.createElement('textarea');
    popupTextarea.value = '';
    popupTextarea.placeholder = 'Type Context Here!';
    popupTextarea.style.width = '100%';
    popupTextarea.style.height = '120px';
    popupTextarea.style.resize = 'none';
    popupTextarea.style.marginBottom = '10px';

    // Create the Generate button
    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate';
    generateButton.style.width = '100%';
    generateButton.style.height = '30px';
    generateButton.style.cursor = 'pointer';
    generateButton.style.border = 'none';
    generateButton.style.backgroundColor = '#4CAF50';
    generateButton.style.color = '#fff';
    generateButton.style.borderRadius = '5px';
    generateButton.style.fontSize = '14px';

    // Append the elements to the button (now acting as the dialog)
    aiButton.appendChild(popupTextarea);
    aiButton.appendChild(generateButton);

    // Event listener for Generate button
    generateButton.addEventListener('click', async () => {
      aiButton.disabled = true;
      aiButton.style.opacity = '0.5';
      try {
        const extractor = new OutlookExtractor();
        const promptText = extractor.getPrompt();

        // Send the prompt to the background script
        chrome.runtime.sendMessage(
          { action: 'generateAIResponse', promptText: promptText },
          (response) => {
            if (response.error) {
              alert(response.error);
            } else {
              // Insert the AI response into the reply box
              insertTextAtCursor(replyBox, response.aiResponse);
            }
            aiButton.disabled = false;
            aiButton.style.opacity = '1';
          }
        );
      } catch (error) {
        alert(error.message);
        aiButton.disabled = false;
        aiButton.style.opacity = '1';
      }
    });
  });

  // Handle mouse leave to revert back to the original button
  aiButton.addEventListener('mouseleave', () => {
    aiButton.style.width = '40px';
    aiButton.style.height = '40px';
    aiButton.style.borderRadius = '50%';
    aiButton.style.display = '';

    // Add transition to smoothly revert back
    aiButton.style.transition = 'width 0.3s, height 0.3s, border-radius 0.3s';

    // Remove the popup content
    setTimeout(() => {
      aiButton.innerHTML = '';
      aiButton.style.backgroundImage = `url('${iconURL}')`;
    }, 300);
  });
};

/**
 * Inserts text at the cursor position in a reply box, handling newlines.
 * @param {HTMLElement} element - The reply box element.
 * @param {string} text - The text to insert.
 */
const insertTextAtCursor = (element, text) => {
  element.focus();

  const selection = window.getSelection();
  if (!selection.rangeCount) return;

  // Delete current selection
  const range = selection.getRangeAt(0);
  range.deleteContents();

  // Create a document fragment to hold the new nodes
  const fragment = document.createDocumentFragment();

  // Split the text by newline characters
  const lines = text.split('\n');
  lines.forEach((line, index) => {
    if (index > 0) {
      // Insert a line break for each newline
      fragment.appendChild(document.createElement('br'));
    }
    if (line) {
      // Insert the text node
      fragment.appendChild(document.createTextNode(line));
    }
  });

  // Keep a reference to the last node inserted
  const lastNode = fragment.lastChild;

  // Insert the fragment into the range
  range.insertNode(fragment);

  // Move the cursor to the end of the inserted content
  if (lastNode) {
    // Create a new range after the last inserted node
    const newRange = document.createRange();
    newRange.setStartAfter(lastNode);
    newRange.collapse(true);

    // Update the selection
    selection.removeAllRanges();
    selection.addRange(newRange);
  }

  // Dispatch an input event to notify the email service of the changes
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
};

// Initialize currentUrl with the current window location
let currentUrl = window.location.href;

// Start observing URL changes and initialize
observeUrlChange();
init();