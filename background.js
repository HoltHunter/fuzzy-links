
async function handleBrowserAction(action) {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });

  switch (action) {
    case "new_tab":
      await chrome.tabs.create({});
      return;

    case "tab_left": {
      if (!active) return;
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (!tabs.length) return;
      const index = (active.index - 1 + tabs.length) % tabs.length;
      await chrome.tabs.update(tabs[index].id, { active: true });
      return;
    }

    case "tab_right": {
      if (!active) return;
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (!tabs.length) return;
      const index = (active.index + 1) % tabs.length;
      await chrome.tabs.update(tabs[index].id, { active: true });
      return;
    }

    case "first_tab": {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (tabs.length) await chrome.tabs.update(tabs[0].id, { active: true });
      return;
    }

    case "last_tab": {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      if (tabs.length) await chrome.tabs.update(tabs[tabs.length - 1].id, { active: true });
      return;
    }

    case "duplicate_tab":
      if (active?.id != null) await chrome.tabs.duplicate(active.id);
      return;

    case "close_tab":
      if (active?.id != null) await chrome.tabs.remove(active.id);
      return;

    case "restore_tab":
      await chrome.sessions.restore();
      return;
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === "FUZZY_LINKS_BROWSER_ACTION") {
    handleBrowserAction(message.action);
    return;
  }

  if (message?.type === "FUZZY_LINKS_OPEN_NEW_TAB" && message.url) {
    chrome.tabs.create({ url: message.url, active: true });
  }

  if (message?.type === "FUZZY_LINKS_OPEN_SETTINGS") {
    chrome.runtime.openOptionsPage();
  }
});
