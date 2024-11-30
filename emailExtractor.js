// emailExtractor.js

class EmailExtractor {
    constructor(maxMessages = 10) {
      this.maxMessages = maxMessages;
    }
  
    getPrompt() {
      // This method should be implemented by subclasses
      throw new Error('getPrompt() must be implemented by subclasses');
    }
  
    expandAllThreads() {
      // This method should be implemented by subclasses
      throw new Error('expandAllThreads() must be implemented by subclasses');
    }
  }
  
  export default EmailExtractor;  