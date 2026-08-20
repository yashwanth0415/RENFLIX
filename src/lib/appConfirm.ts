export function appConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent("renflix:request-confirm", { detail: { message, resolve } }));
  });
}
