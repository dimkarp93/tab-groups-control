document.getElementById("help").addEventListener("click", () => {
  browser.runtime.sendMessage({ type: "open-help" });
});

document.addEventListener("keydown", (event) => {
  if (!event.ctrlKey || !event.altKey || event.metaKey) return;
  if (event.key !== "?" && event.key !== "/" && event.code !== "Slash") return;
  event.preventDefault();
  browser.runtime.sendMessage({ type: "open-help" });
});
