// gmailExtractor.js

import EmailExtractor from './emailExtractor.js';

/*
* GmailExtractor is a subclass of EmailExtractor that extracts email details from Gmail.
* The getPrompt() method extracts the email details from the first few emails in Gmail and returns them as a string.
* The expandAllThreads() method expands all threads in Gmail to ensure that all email details are visible.
*/
class GmailExtractor extends EmailExtractor {
    constructor(maxMessages) {
        super(maxMessages);
    }

    /*
    * Expands all threads in Gmail to ensure that all email details are visible.
    */
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

    /*
    * Extracts the email thread details from the first few emails in Gmail.
    * Returns the email thread details as a string.
    */
    getPrompt() {
        this.expandAllThreads();

        let emailThread = '';
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
            let recipients = Array.from(recipientElements).map(el => {
                let name = el.getAttribute('name') || '';
                let email = el.getAttribute('email') || '';
                return `${name} <${email}>`;
            }).join(', ') || 'Unknown Recipient';

            // Extract email body
            let bodyElement = message.querySelector('div.a3s');
            let body = bodyElement?.innerText || bodyElement?.textContent || 'No Content';

            // Build the email thread string
            emailThread += `From: ${senderName} <${senderEmail}>\nTo: ${recipients}\n\n${body}\n\n---\n\n`;
        }

        return emailThread
    }
}

export default GmailExtractor;