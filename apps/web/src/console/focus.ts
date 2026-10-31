// Where keyboard focus goes after a chip's Change or a quick reply sends a message: the button that was pressed is
// replaced (the question closes, the chip waits for the commit), so focus would fall to the page. The composer is
// where the handoff from the landing puts it too.
export function focusComposer(): void {
  if (typeof document === 'undefined') return;
  document.querySelector<HTMLTextAreaElement>('.cmp__field')?.focus({ preventScroll: true });
}
