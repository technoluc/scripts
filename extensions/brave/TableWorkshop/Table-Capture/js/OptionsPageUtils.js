const createAlertPane = (
  message,
  alertLevel = "warning",
  dismissable = false
) => {
  const pane = document.createElement("div");
  pane.innerText = message;
  pane.className = `alert alert-${alertLevel}`;
  if (dismissable) {
    pane.addEventListener("click", () => pane.remove());
  }
  return pane;
};

const createAlertPaneWithHTML = (
  html,
  alertLevel = "warning",
  dismissable = false
) => {
  const pane = createAlertPane("", alertLevel, dismissable);
  pane.innerHTML = html;
  return pane;
};

const getUrlParams = () => {
  const search = window.location.search;
  if (!search || search.length <= 1) {
    return {};
  }
  const parts = search.substring(1).split("&");
  const params = {};
  parts.forEach((part) => {
    if (part.includes("=")) {
      const [key, value] = part.split("=");
      params[key] = value;
    } else {
      params[part.trim()] = true;
    }
  });
  return params;
};
