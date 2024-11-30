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

async function displayEmailData(emailsData) {
  const emailDataDiv = document.getElementById('emailData');
  emailDataDiv.innerHTML = ''; // Clear previous content

  for (let index = 0; index < emailsData.length; index++) {
    const email = emailsData[index];

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

    // Wait for the AI query to resolve before adding it to the email entry

    emailDataDiv.appendChild(emailDiv);

    queryAI(emailDataDiv);
  }
}

async function queryAI(emailDiv) {
   // Retrieve the HTML content under 'emailDataDiv'
  // const emailDataDiv = document.getElementById('emailData');
  
  // Collect the text content of each email entry
  let emailsText = '';
  const emailEntries = emailDiv.getElementsByClassName('email-entry');

  // Loop through each email entry and extract key information
  for (const emailEntry of emailEntries) {
    const header = emailEntry.querySelector('h3').innerText; // Extract Message info
    const senderInfo = emailEntry.querySelector('p').innerText; // Extract sender info
    const recipientInfo = emailEntry.querySelectorAll('p')[1].innerText; // Extract recipient info
    const body = emailEntry.querySelector('p:nth-of-type(3)').innerText; // Extract body text
    
    // Append each email entry's information to the prompt
    emailsText += `Message: ${header}\n`;
    emailsText += `${senderInfo}\n`;
    emailsText += `${recipientInfo}\n`;
    emailsText += `Body: ${body}\n\n`; // Add some extra space between emails
  }

  // Now you have the raw text of all email data, which you can use as a prompt
  const promptText = `Here is the email data:\n\n${emailsText}\nBased on the above, provide an appropriate response`;

  // Call the AI model to generate a response
  if (!('aiOriginTrial' in chrome)) {
      alert('Error: chrome.aiOriginTrial not supported in this browser');
      return;
  }
  // Check model capabilities
  const capabilities = await chrome.aiOriginTrial.languageModel.capabilities();

  if (capabilities.available === 'no') {
    alert('Prompt API is not available.');
    return null;
  } else if (capabilities.available === 'after-download') {
    // Trigger model download and monitor progress
    await chrome.aiOriginTrial.languageModel.create({
      monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
          console.log(`Downloaded ${e.loaded} of ${e.total} bytes.`);
        });
      },
    });
  }

  // Initialize session with a system prompt
  const systemPrompt = 'You are an AI assistant that helps users write professional and appropriate email responses. Read the email thread and generate a suitable reply that is polite, concise, and addresses the points mentioned.';
  const session = await chrome.aiOriginTrial.languageModel.create({
    systemPrompt: systemPrompt,
  });

  // Prompt the model with the email thread
  const result = await session.prompt(promptText);

  // Destroy the session to free resources
  session.destroy();

  alert(result);
}