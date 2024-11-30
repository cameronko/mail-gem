// outlookExtractor.js

import EmailExtractor from './emailExtractor.js';

class OutlookExtractor extends EmailExtractor {
    constructor(maxMessages) {
        super(maxMessages);
    }

    expandAllThreads() {
        try {
            const threadElements = document.querySelectorAll('.GjFKx.WWy1F.YoK0k');
            threadElements.forEach(thread => {
            thread.click();
            });
        } catch (error) {
            throw new Error('Failed to expand all threads in Outlook.');
        }
    }

    getPrompt() {
        this.expandAllThreads();
        
        let emailThread = '';
        const emailElements = document.querySelectorAll('[aria-label="Email message"]');
        if (!emailElements.length) {
            throw new Error('No emails found in Outlook.');
        }

        for (let i = 0; i < Math.min(this.maxMessages, emailElements.length); i++) {\
            // Extract sender and recipient names
            const emailElement = emailElements[i];
            const fromElement = emailElement.querySelector('[aria-label^="From:"]');
            const toElement = emailElement.querySelector('[aria-label^="To:"]');
            const bodyElement = emailElement.querySelector('[aria-label="Message body"]');

            if (!fromElement || !toElement || !bodyElement) {
            throw new Error('Failed to extract email details in Outlook.');
            }

            // Extract sender and recipient names
            const fromName = fromElement.textContent.trim();
            const toName = toElement.textContent.trim();
            const body = bodyElement.innerText.trim();

            // Build the email thread string
            emailThread += `From: ${fromName}\nTo: ${toName}\n\n${body}\n\n---\n\n`;
        }

        return emailThread;
    }
}

export default OutlookExtractor;