// contentScript.js

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractEmailData') {
      expandAllMessages(() => {
        const emailsData = getGmailThreadParticipants();
        sendResponse({ emailsData });
      });
      // Return true to indicate that we'll respond asynchronously
      return true;
    }
  });
  
  // Function to expand all messages
  function expandAllMessages(callback) {
    const expandAllButton = document.querySelector('button[aria-label="Expand all"]');
  
    if (expandAllButton) {
      // Click the "Expand all" button
      expandAllButton.click();
  
      // Wait for messages to expand
      const observer = new MutationObserver(() => {
        // Disconnect the observer after changes are detected
        observer.disconnect();
        callback();
      });
  
      // Observe changes in the message list
      const messageList = document.querySelector('div[role="list"]');
      observer.observe(messageList, { childList: true, subtree: true });
  
      // Optionally, set a timeout in case the mutation doesn't trigger
      setTimeout(() => {
        observer.disconnect();
        callback();
      }, 2000); // Adjust the timeout as needed
    } else {
      // No "Expand all" button found; proceed without expanding
      callback();
    }
  }
  
  // Function to extract email data
  function getGmailThreadParticipants() {
    const messages = document.querySelectorAll('div[role="listitem"]');
    const emailsData = [];
  
    messages.forEach((message) => {
      const isExpanded = message.getAttribute('aria-expanded') === 'true';
  
      let senderName = '';
      let senderEmail = '';
      let recipients = [];
      let emailBody = '';
  
      if (isExpanded) {
        // Sender information
        const senderElement = message.querySelector('.gD');
        if (senderElement) {
          senderName = senderElement.getAttribute('name') || senderElement.innerText;
          senderEmail = senderElement.getAttribute('email') || '';
        }
  
        // Recipient information
        const recipientElements = message.querySelectorAll('.g2');
        recipients = Array.from(recipientElements).map((recipientElement) => ({
          name: recipientElement.getAttribute('name') || recipientElement.innerText,
          email: recipientElement.getAttribute('email') || '',
        }));
  
        // Email body
        const emailBodyElement = message.querySelector('.a3s');
        emailBody = emailBodyElement ? emailBodyElement.innerText : '';
      } else {
        // Collapsed message: limited data
        const senderElement = message.querySelector('.zF');
        if (senderElement) {
          senderName = senderElement.innerText || '';
          senderEmail = senderElement.getAttribute('email') || '';
        }
  
        const snippetElement = message.querySelector('.y2');
        emailBody = snippetElement ? snippetElement.innerText : '';
      }
  
      emailsData.push({
        sender: {
          name: senderName,
          email: senderEmail,
        },
        recipients: recipients,
        body: emailBody,
      });
    });
  
    return emailsData;
}