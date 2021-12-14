export function handleSlotEmpty(slot: HTMLSlotElement) {
    slot.toggleAttribute('empty', !slot.assignedNodes().length);
}