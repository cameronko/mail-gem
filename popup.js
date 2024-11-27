// popup.js

document.addEventListener('DOMContentLoaded', () => {
    // Query the active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
  
      // Send a message to the content script
      chrome.tabs.sendMessage(
        activeTab.id,
        { action: 'extractEmailData' },
        (response) => {
          if (chrome.runtime.lastError) {
            document.getElementById('emailData').innerText =
              'Error: ' + chrome.runtime.lastError.message;
            return;
          }
  
          if (response && response.emailsData) {
            displayEmailData(response.emailsData);
          } else {
            document.getElementById('emailData').innerText =
              'No email data found.';
          }
        }
      );
    });
  });
  
  function displayEmailData(emailsData) {
    const emailDataDiv = document.getElementById('emailData');
    emailDataDiv.innerHTML = ''; // Clear previous content
  
    emailsData.forEach((email, index) => {
      const emailDiv = document.createElement('div');
      emailDiv.classList.add('email-entry');
      emailDiv.style.marginBottom = '15px';
  
      const header = document.createElement('h3');
      header.innerText = `Message ${index + 1}`;
      emailDiv.appendChild(header);
  
      const senderInfo = document.createElement('p');
      senderInfo.innerHTML = `<strong>From:</strong> ${email.sender.name} &lt;${email.sender.email}&gt;`;
      emailDiv.appendChild(senderInfo);
  
      const recipientInfo = document.createElement('p');
      const recipientList = email.recipients
        .map((rec) => `${rec.name} &lt;${rec.email}&gt;`)
        .join(', ');
      recipientInfo.innerHTML = `<strong>To:</strong> ${recipientList}`;
      emailDiv.appendChild(recipientInfo);
  
      const body = document.createElement('p');
      body.innerHTML = `<strong>Body:</strong><br>${email.body.replace(/\n/g, '<br>')}`;
      emailDiv.appendChild(body);
  
      emailDataDiv.appendChild(emailDiv);
    });
}  