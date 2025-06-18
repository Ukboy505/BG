// js/toggle.js
function toggleSection(containerId, buttonId) {
            const container = document.getElementById(containerId);
            const buttons = document.querySelectorAll(`[onclick="toggleSection('${containerId}', '${buttonId}')]`);

            if (container.style.display === 'none') {
                container.style.display = 'block';
                buttons.forEach(button => {
                    button.innerHTML = button.innerHTML.replace('Show', 'Hide').replace('▼', '▲');
                });
            } else {
                container.style.display = 'none';
                buttons.forEach(button => {
                    button.innerHTML = button.innerHTML.replace('Hide', 'Show').replace('▲', '▼');
                });
            }
        }