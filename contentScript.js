// contentScript.js

(() => {
  /**
   * GmailExtractor Class
   * Extracts email threads and generates a structured prompt from Gmail.
   */
  class GmailExtractor {
    constructor(maxMessages = 10) {
      this.maxMessages = maxMessages;
    }

    expandAllThreads() {
      try {
        const expandAllButton = document.querySelector('[aria-label="Expand all"]');
        if (expandAllButton) {
          expandAllButton.click();
        }
      } catch (error) {
        throw new Error('Failed to expand all threads in Gmail.');
      }
    }

    getPrompt() {
      this.expandAllThreads();

      let emailThread = 'Here is an email thread to respond to:\n\n';
      const emailElements = document.querySelectorAll('div.adn.ads[data-legacy-message-id]');
      if (!emailElements.length) {
        throw new Error('No emails found in Gmail.');
      }

      for (let i = 0; i < Math.min(this.maxMessages, emailElements.length); i++) {
        let message = emailElements[i];
        let senderElement = message.querySelector('.gD');
        let senderName = senderElement?.getAttribute('name') || 'Unknown Sender';
        let senderEmail = senderElement?.getAttribute('email') || '';

        let recipientElements = message.querySelectorAll('.g2');
        let recipients =
          Array.from(recipientElements)
            .map((el) => {
              let name = el.getAttribute('name') || '';
              let email = el.getAttribute('email') || '';
              return `${name} <${email}>`;
            })
            .join(', ') || 'Unknown Recipient';

        let bodyElement = message.querySelector('div.a3s');
        let body = bodyElement?.innerText || bodyElement?.textContent || 'No Content';

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
    constructor(maxMessages = 10) {
      this.maxMessages = maxMessages;
    }

    expandAllThreads() {
      const conversationPanel = document.querySelector('[aria-label="Reading Pane"]');
      const unexpandedMessages = conversationPanel.querySelectorAll('div[aria-expanded="false"]');
      unexpandedMessages.forEach((message) => message.firstChild.click());
    }

    getPrompt() {
      this.expandAllThreads();

      let emailThread = 'Here is an email thread to respond to:\n\n';
      const emailElements = document.querySelectorAll('div[aria-label="Email message"]');
      if (!emailElements.length) {
        throw new Error('No emails found in Outlook.');
      }

      for (let i = 0; i < Math.min(this.maxMessages, emailElements.length); i++) {
        const emailElement = emailElements[i];

        const fromElement = emailElement.querySelector('span[aria-label^="From: "] span.OZZZK');
        const fromName = fromElement?.textContent.trim() || 'Unknown Sender';

        const toElement = emailElement.querySelector('div[aria-label^="To: "]');
        let recipients = 'Unknown Recipient';
        if (toElement) {
          const toElements = toElement.querySelectorAll('span.pU1YL');
          recipients =
            Array.from(toElements)
              .map((el) => el.textContent.trim())
              .join(', ') || 'Unknown Recipient';
        }

        const bodyElement = emailElement.querySelector('div[aria-label="Message body"]');
        const body = bodyElement?.innerText.trim() || 'No Content';

        emailThread += `From: ${fromName}\nTo: ${recipients}\n\n${body}\n\n---\n\n`;
      }

      console.log(emailThread);

      return emailThread;
    }
  }

  /**
   * Inserts the AI button into the reply or compose box.
   */
  const insertAIButton = (replyBox, isGmail = true, isNewEmail = false) => {
    if (!replyBox) return;

    // Avoid inserting multiple buttons
    if (document.getElementById('mailgem-ai-button')) return;

    // Create the AI button
    const aiButton = document.createElement('div');
    aiButton.id = 'mailgem-ai-button';
    aiButton.title = 'Generate AI Response';
    // Add extra bottom margin for gmail to ensure it doesn't cut off the delete button
    if (isGmail){
      aiButton.style.bottom = '60px';
    }
    aiButton.classList.add('mailgem-ai-button');

    // Create the icon element
    const iconURL = chrome.runtime.getURL('icons/icon48.png');
    const aiIcon = document.createElement('div');
    aiIcon.classList.add('mailgem-ai-icon');
    aiIcon.style.backgroundImage = `url('${iconURL}')`;

    aiButton.appendChild(aiIcon);

    // Get the replyBox element's container
    let container = replyBox.parentElement;
    if (!container) {
      console.error('Reply box container not found');
      container = document.body;
    }

    // Append the button to the reply box container
    container.style.position = 'relative';
    container.appendChild(aiButton);

    // Handle mouse events
    aiButton.addEventListener('mouseenter', () => {
      aiButton.classList.add('expanded');
    });

    aiButton.addEventListener('mouseleave', () => {
      aiButton.classList.remove('expanded');
    });

    // Create the popup content
    const popupTextarea = document.createElement('textarea');
    popupTextarea.classList.add('mailgem-ai-textarea');
    popupTextarea.placeholder = isNewEmail ? 'Provide context for your new email...' : 'Type context here...';

    const generateButton = document.createElement('button');
    generateButton.classList.add('mailgem-ai-generate-button');
    generateButton.textContent = 'Generate';

    // Append the popup content to the aiButton
    aiButton.appendChild(popupTextarea);
    aiButton.appendChild(generateButton);

    // Listener to remove focus on the text area when the popup collapses
    aiButton.addEventListener('mouseleave', () => {
      if (document.activeElement === popupTextarea) {
        popupTextarea.blur();
      }
    });

    // Event listener for Generate button
    generateButton.addEventListener('click', async () => {
      generateButton.disabled = true;
      generateButton.style.opacity = '0.5';
      try {
        // If it's a new email, ensure context is provided
        if (isNewEmail && !popupTextarea.value.trim()) {
          alert('Please provide context for your new email.');
          generateButton.disabled = false;
          generateButton.style.opacity = '1';
          return;
        }

        const extractor = isGmail ? new GmailExtractor() : new OutlookExtractor();
        const promptText = extractor.getPrompt();

        // Include the context from the textarea if available
        const userContext = popupTextarea.value.trim();
        const fullPrompt = userContext
          ? isNewEmail
            ? `The user wants to write a new email here are instructions: ${userContext}`
            : `For this email thread, the respondee also included this context: ${userContext}\n\n${promptText}`
          : promptText;

        // Send the prompt to the background script
        chrome.runtime.sendMessage(
          { action: 'generateAIResponse', promptText: fullPrompt },
          (response) => {
            if (response.error) {
              alert(response.error);
            } else {
              // Insert the AI response into the reply box
              insertTextAtCursor(replyBox, response.aiResponse);
            }
            generateButton.disabled = false;
            generateButton.style.opacity = '1';
          }
        );
      } catch (error) {
        alert(error.message);
        generateButton.disabled = false;
        generateButton.style.opacity = '1';
      }
    });

    // Prevent popup from closing when interacting with textarea
    popupTextarea.addEventListener('mousedown', (event) => {
      event.stopPropagation();
    });
    popupTextarea.addEventListener('click', (event) => {
      event.stopPropagation();
    });
    popupTextarea.addEventListener('focus', (event) => {
      event.stopPropagation();
    }, true); // Use the capture phase to intercept focus early
  };

  /**
   * Monitors the DOM for Gmail's compose and reply boxes and inserts the AI button.
   */
  const monitorGmailComposeOrReplyBox = () => {
    const observer = new MutationObserver(() => {
      // Detect Compose Box
      const composeBox = document.querySelector('div.aoI[aria-label="New Message"]');
      if (composeBox && !composeBox.dataset.aiButtonInjected) {
        insertAIButton(composeBox, true, true); // isGmail=true, isNewEmail=true
        composeBox.dataset.aiButtonInjected = 'true';
      }

      // Detect Reply Box
      const replyBox = document.querySelector('div.aoI[aria-label^="Re:"]');
      if (replyBox && !replyBox.dataset.aiButtonInjected) {
        insertAIButton(replyBox, true, false); // isGmail=true, isNewEmail=false
        replyBox.dataset.aiButtonInjected = 'true';
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check
    const composeBox = document.querySelector('div.aoI[aria-label="New Message"]');
    if (composeBox && !composeBox.dataset.aiButtonInjected) {
      insertAIButton(composeBox, true, true);
      composeBox.dataset.aiButtonInjected = 'true';
    }

    const replyBox = document.querySelector('div.aoI[aria-label^="Re:"]');
    if (replyBox && !replyBox.dataset.aiButtonInjected) {
      insertAIButton(replyBox, true, false);
      replyBox.dataset.aiButtonInjected = 'true';
    }
  };

  /**
   * Monitors the DOM for Outlook's compose and reply boxes and inserts the AI button.
   */
  const monitorOutlookComposeOrReplyBox = () => {
    const observer = new MutationObserver(() => {
      // Detect Compose Box
      const composeBox = document.querySelector('div.aoI[aria-label="New Message"]'); // Adjust selector if different
      if (composeBox && !composeBox.dataset.aiButtonInjected) {
        insertAIButton(composeBox, false, true); // isGmail=false, isNewEmail=true
        composeBox.dataset.aiButtonInjected = 'true';
      }

      // Detect Reply Box
      const replyBoxElement = document.querySelector('[aria-label^="Message body"]');
      const isReply = replyBoxElement && replyBoxElement.closest('[data-app-section^="ConversationContainer"]') !== null;
      const messageBodySelector = '[role="textbox"][aria-label^="Message body"][contenteditable="true"]';
      const messageBody = document.querySelector(messageBodySelector);
      if (messageBody && !messageBody.dataset.aiButtonInjected) {
        insertAIButton(messageBody, false, isReply ? false : true); // isGmail=false, isNewEmail= !isReply
        messageBody.dataset.aiButtonInjected = 'true';
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Initial check for Compose Box
    const composeBox = document.querySelector('div.aoI[aria-label="New Message"]'); // Adjust selector if different
    if (composeBox && !composeBox.dataset.aiButtonInjected) {
      insertAIButton(composeBox, false, true);
      composeBox.dataset.aiButtonInjected = 'true';
    }

    // Initial check for Reply Box
    const replyBoxElement = document.querySelector('[aria-label^="Message body"]');
    const isReply = replyBoxElement && replyBoxElement.closest('[data-app-section^="ConversationContainer"]') !== null;
    const messageBodySelector = '[role="textbox"][aria-label^="Message body"][contenteditable="true"]';
    const messageBody = document.querySelector(messageBodySelector);
    if (messageBody && !messageBody.dataset.aiButtonInjected) {
      insertAIButton(messageBody, false, isReply ? false : true);
      messageBody.dataset.aiButtonInjected = 'true';
    }
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
      const newRange = document.createRange();
      newRange.setStartAfter(lastNode);
      newRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(newRange);
    }

    // Dispatch an input event to notify the email service of the changes
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  };

  /**
   * Observes URL changes to detect navigation and initializes the script.
   */
  const observeUrlChange = () => {
    const bodyList = document.querySelector('body');
    const observer = new MutationObserver(function () {
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
      monitorGmailComposeOrReplyBox();
    } else if (
      currentUrl.includes('outlook.office.com') ||
      currentUrl.includes('outlook.live.com') ||
      currentUrl.includes('outlook.office365.com')
    ) {
      monitorOutlookComposeOrReplyBox();
    }
  };

  // Initialize currentUrl with the current window location
  let currentUrl = window.location.href;

  // Start observing URL changes and initialize
  observeUrlChange();
  init();
})();
