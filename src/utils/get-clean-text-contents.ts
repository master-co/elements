export function getCleanTextContents(childNodes: Node[] | NodeList) {
    return (Array.isArray(childNodes) ? childNodes : Array.from(childNodes))
        .filter((node) => node instanceof HTMLElement && !node.slot || node instanceof Text)
        .map((eachNode) => eachNode.textContent)
        .join(' ')
        .trim();
}