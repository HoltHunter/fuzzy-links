chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "FUZZY_LINKS_OPEN_NEW_TAB" && message.url) {
    chrome.tabs.create({ url: message.url, active: true });
  }

  if (message?.type === "FUZZY_LINKS_OPEN_SETTINGS") {
    chrome.runtime.openOptionsPage();
  }
});
