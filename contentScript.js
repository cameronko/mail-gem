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
    unexpandedMessages.forEach(message => message.firstChild.click());
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
        recipients = Array.from(toElements)
          .map(el => el.textContent.trim())
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
    monitorGmailAction();
  } else if (
    currentUrl.includes('outlook.office.com') ||
    currentUrl.includes('outlook.live.com') ||
    currentUrl.includes('outlook.office365.com')
  ) {
    monitorOutlookAction();
  }
};

/**
 * Monitors Gmail interactions to insert the AI button when appropriate.
 */
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

/**
 * Inserts the AI button into Gmail's reply box.
 */
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


  let popupContent = ''; // Persistent variable to store popup content

aiButton.addEventListener('mouseover', async () => {
    // Create the popup element as a text entry box
    const popup = document.createElement('textarea');
    popup.value = popupContent; // Restore previous content
    popup.placeholder = 'Type Context Here!';
    popup.style.position = 'absolute';
    popup.style.backgroundColor = '#fff';
    popup.style.border = '1px solid #ccc';
    popup.style.borderRadius = '5px';
    popup.style.padding = '10px';
    popup.style.boxShadow = '0px 4px 6px rgba(0, 0, 0, 0.1)';
    popup.style.zIndex = '1000';
    popup.style.width = '300px'; // Adjust width
    popup.style.height = '150px'; // Adjust height
    popup.style.resize = 'none'; // Optional: Disable resizing

    // Position the popup further to the left
    const rect = aiButton.getBoundingClientRect();
    popup.style.top = `${rect.top - 190}px`; // Adjust offset to match size
    popup.style.left = `${rect.left - 200}px`; // Move further to the left

    // Add the popup to the document
    document.body.appendChild(popup);

    // Add a flag to track whether the popup is being hovered
    let isPopupHovered = false;

    // Keep the popup when hovered
    popup.addEventListener('mouseover', () => {
        isPopupHovered = true;
    });

    popup.addEventListener('mouseleave', () => {
        isPopupHovered = false;
        popupContent = popup.value; // Save content before removal
        // Delay removal slightly to allow re-entry to popup
        setTimeout(() => {
            if (!isPopupHovered) popup.remove();
        }, 100);
    });

    // Remove the popup when the mouse leaves the button
    aiButton.addEventListener(
        'mouseleave',
        () => {
            setTimeout(() => {
                if (!isPopupHovered) {
                    popupContent = popup.value; // Save content before removal
                    popup.remove();
                }
            }, 100);
        },
        { once: true }
    );



    if (!document.querySelector('#generate-ai-icon')) {
      // Create a new button for the icon
      const aiIcon = document.createElement('button');
      aiIcon.id = 'generate-ai-icon';
      aiIcon.title = 'Generate Your Email';
      aiIcon.style.width = '32px';
      aiIcon.style.height = '32px';
      aiIcon.style.borderRadius = '50%';
      aiIcon.style.border = 'none';
      aiIcon.style.cursor = 'pointer';
      aiIcon.style.boxShadow = '0px 1px 6px rgba(0,0,0,0.3)';

      // Get the icon URL from the extension's icons folder
      const iconPath = chrome.runtime.getURL('icons/generateIcon32.png');
      aiIcon.style.backgroundImage = `url('${iconPath}')`;
      aiIcon.style.backgroundSize = 'contain';
      aiIcon.style.backgroundRepeat = 'no-repeat';
      aiIcon.style.backgroundPosition = 'center';

      // Position the icon below the existing button
      const aiButtonRect = aiButton.getBoundingClientRect();
      aiIcon.style.position = 'absolute';
      aiIcon.style.top = `${aiButtonRect.bottom + 10}px`; // Adjust spacing below the button
      aiIcon.style.left = `${aiButtonRect.left + (aiButtonRect.width / 2) - 16}px`; // Align with the button

      // Add the icon to the document
      document.body.appendChild(aiIcon);

      // Remove the icon when the mouse leaves both the main button and the new icon
      const removeIcon = () => {
          aiIcon.remove();
          aiButton.removeEventListener('mouseleave', removeIcon);
          aiIcon.removeEventListener('mouseleave', removeIcon);
      };

      aiButton.addEventListener('mouseleave', removeIcon, { once: true });
      aiIcon.addEventListener('mouseleave', removeIcon, { once: true });
  }
  });
};

/**
 * Monitors Outlook interactions to insert the AI button when appropriate.
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

/**
 * Inserts the AI button into Outlook's reply box.
 */
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
  // This is necessary for updating drafts, the visual editor, etc.
  const event = new Event('input', { bubbles: true });
  element.dispatchEvent(event);
};

// Initialize currentUrl with the current window location
let currentUrl = window.location.href;

// Start observing URL changes and initialize
observeUrlChange();
init();
