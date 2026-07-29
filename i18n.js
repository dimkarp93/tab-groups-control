function t(key, ...subs) {
  return browser.i18n.getMessage(key, subs.map(String));
}

function uiLocale() {
  return browser.i18n.getUILanguage();
}

function applyI18n(root = document) {
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-title]")) {
    node.title = t(node.dataset.i18nTitle);
  }
  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  }
  if (root === document) {
    document.title = t("extActionTitle");
    document.documentElement.lang = uiLocale();
  }
}
