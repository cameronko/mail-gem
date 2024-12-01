// contentScript.js

// GmailExtractor Class
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
      // Extract sender's name and email
      let message = emailElements[i];
      let senderElement = message.querySelector('.gD');
      let senderName = senderElement?.getAttribute('name') || 'Unknown Sender';
      let senderEmail = senderElement?.getAttribute('email') || '';

      // Extract recipients
      let recipientElements = message.querySelectorAll('.g2');
      let recipients = Array.from(recipientElements)
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

// OutlookExtractor Class
class OutlookExtractor {
  constructor(maxMessages = 10) {
    this.maxMessages = maxMessages;
  }

  expandAllThreads() {
    // Implement thread expansion if necessary
  }

  getPrompt() {
    // Optionally expand threads
    this.expandAllThreads();

    let emailThread = 'Here is an email thread to respond to:\n\n';
    const emailElements = document.querySelectorAll('div[role="listitem"][data-convid]');
    if (!emailElements.length) {
      throw new Error('No emails found in Outlook.');
    }

    for (let i = 0; i < Math.min(this.maxMessages, emailElements.length); i++) {
      const emailElement = emailElements[i];

      // Extract sender
      const fromElement = emailElement.querySelector('div[data-sender-name]');
      const fromName = fromElement?.getAttribute('data-sender-name') || 'Unknown Sender';

      // Extract recipients
      const toElements = emailElement.querySelectorAll('span._pe_8');
      const recipients = Array.from(toElements)
        .map((el) => el.textContent.trim())
        .join(', ') || 'Unknown Recipient';

      // Extract email body
      const bodyElement = emailElement.querySelector('div[autoid][role="presentation"]');
      const body = bodyElement?.innerText.trim() || 'No Content';

      // Build the email thread string
      emailThread += `From: ${fromName}\nTo: ${recipients}\n\n${body}\n\n---\n\n`;
    }

    return emailThread;
  }
}

// Rest of your content script code
(function () {
  let currentUrl = window.location.href;

  // Observe URL changes to detect navigation
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

  // Initialize the content script if the current URL matches the supported email services
  const init = () => {
    if (currentUrl.includes('mail.google.com')) {
      monitorGmailAction();
    } else if (
      currentUrl.includes('outlook.office.com') ||
      currentUrl.includes('outlook.live.com') ||
      currentUrl.includes('outlook.office365.com')
    ) {
      monitorOutlookAction();
    }
  };

  const monitorGmailAction = () => {
    document.addEventListener('click', function (e) {
      const target = e.target;
  
      // Case 1: Footer buttons ("Reply" and "Forward")
      const footerButton = target.closest('span.ams[role="link"]');
      if (footerButton && (footerButton.textContent === 'Reply' || footerButton.textContent === 'Forward')) {
        setTimeout(() => {
          insertAIButtonGmail();
        }, 500); // Wait for the reply box to appear
        return;
      }
  
      // Case 2: "More" menu Reply/Forward button
      const moreMenuButton = target.closest('div[role="menuitem"]');
      if (moreMenuButton && (moreMenuButton.id == 'r' || moreMenuButton.id === 'r3')) { // 'r' is the ID for reply, 'r3' is the ID for forward
        setTimeout(() => {
          insertAIButtonGmail();
        }, 500); // Wait for the reply box to appear
        return;
      }
  
      // Case 3: Toolbar/other buttons (Reply, Reply All, Forward)
      const toolbarButton = target.closest('div[role="button"][aria-label]');
      if (toolbarButton) {
        const label = toolbarButton.getAttribute('aria-label');
        if (['Reply', 'Reply all', 'Forward'].includes(label)) {
          setTimeout(() => {
            insertAIButtonGmail();
          }, 500); // Wait for the reply box to appear
        }
      }
    }, true // Use capture phase to catch the event early
    );
  };  

  const insertAIButtonGmail = () => {
    const replyBox = document.querySelector('div[aria-label="Message Body"]');
    if (!replyBox) return;

    // Avoid inserting multiple buttons
    if (document.getElementById('mailgem-ai-button')) return;

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

    // Append the button to the reply box container
    container = replyBox.parentElement;
    if (container) {
      container.style.position = 'relative';
      container.appendChild(aiButton);
    }

    aiButton.addEventListener('click', async () => {
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
  };

  /*
    * Monitor the reply button in Outlook and insert the AI button
    * The reply button in Outlook is a button with the aria-label attribute set to "Reply", "Reply all", or "Forward".
  */
  const monitorOutlookAction = () => {
    document.addEventListener(
      'click',
      function (e) {
        const targetButton = e.target.closest('button[aria-label]');
        if (!targetButton) return; // Exit if no button is clicked
  
        const buttonLabel = targetButton.getAttribute('aria-label');
  
        if (['Reply', 'Reply all', 'Forward'].includes(buttonLabel)) {
          setTimeout(() => {
            insertAIButtonOutlook();
          }, 500); // Wait for the reply box to appear
        }
      },
      true // Use capture phase to catch the event early
    );
  };  

  const insertAIButtonOutlook = () => {
    const replyBox = document.querySelector('div[aria-label="Message body"]');
    if (!replyBox) return;

    // Avoid inserting multiple buttons
    if (document.getElementById('mailgem-ai-button')) return;

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

    // Append the button to the reply box container
    const container = replyBox.closest('div.ms-Viewport');
    if (container) {
      container.style.position = 'relative';
      container.appendChild(aiButton);
    }

    aiButton.addEventListener('click', async () => {
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
  };

  // Function to insert text at the cursor position, handling newlines
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
    // This is necessary for updating drafts, the visual editor, etc.
    const event = new Event('input', { bubbles: true });
    element.dispatchEvent(event);
  };

  // Start observing URL changes and initialize
  observeUrlChange();
  init();
})();