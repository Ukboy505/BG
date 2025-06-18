function toggleSection(elementOrId, toggleId) {
    let section, toggleElement;
    
    if (typeof elementOrId === 'string') {
        section = document.getElementById(elementOrId);
        toggleElement = document.getElementById(toggleId);
    } else {
        toggleElement = elementOrId;
        section = toggleElement.nextElementSibling;
    }

    if (section && toggleElement) {
        const isHidden = section.style.display === 'none' || section.style.display === '';
        section.style.display = isHidden ? 'block' : 'none';
        toggleElement.innerHTML = isHidden ? 
            toggleElement.innerHTML.replace('▼', '▲') : 
            toggleElement.innerHTML.replace('▲', '▼');
    }
}
