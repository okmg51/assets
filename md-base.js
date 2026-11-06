// md-base.js

// -----------------------------------------------------------------------------
// 1. Alertes dans les blockquotes (via emojis)
// -----------------------------------------------------------------------------
function initAlerts() {
    const blockquotes = document.querySelectorAll('blockquote');
    if (!blockquotes.length) return;

    const alertConfig = {
        'ℹ️': 'note',
        '💡': 'conseil',
        '❗': 'important',
        '⚠️': 'attention',
        '🛑': 'avertissement'
    };

    blockquotes.forEach(blockquote => {
        const p = blockquote.querySelector('p');
        if (!p || p.querySelector('.icon')) return;

        const texte = p.textContent.trim();
        const icone = Object.keys(alertConfig).find(
            emoji => texte.startsWith(emoji)
        );
        if (!icone) return;

        blockquote.classList.add(alertConfig[icone]);

        // ✅ FIX 3 : gestion du cas où l'emoji est dans un <strong> en début
        // de paragraphe (le premier nœud n'est alors pas un nœud texte).
        let premierTexte = p.firstChild;
        let span = null;

        if (premierTexte && premierTexte.nodeType === Node.TEXT_NODE) {
            // Cas 1 : texte brut en début de paragraphe
            premierTexte.textContent =
                premierTexte.textContent.replace(icone, '').trimStart();

            span = document.createElement('span');
            span.className = 'icon';
            span.textContent = icone;
            p.insertBefore(span, p.firstChild);
        } else if (premierTexte && premierTexte.nodeType === Node.ELEMENT_NODE) {
            // Cas 2 : emoji dans un élément enfant (ex. <strong>⚠️ Attention</strong>)
            const strong = premierTexte.closest('strong') || p.querySelector('strong');
            if (strong && strong.textContent.trim().startsWith(icone)) {
                strong.textContent =
                    strong.textContent.replace(icone, '').trimStart();

                span = document.createElement('span');
                span.className = 'icon';
                span.textContent = icone;
                p.insertBefore(span, p.firstChild);
            }
        }

        // ✅ FIX 3 (suite) : le header est construit avec l'icône effectivement
        // créée, qu'elle soit dans le texte ou dans un <strong>.
        const strong = p.querySelector('strong');
        const icon = span || p.querySelector('.icon');

        if (strong && icon) {
            const entete = document.createElement('div');
            entete.className = 'alert-header';
            p.insertBefore(entete, p.firstChild);
            entete.append(icon, strong);
        }
    });
}

// -----------------------------------------------------------------------------
// 2. Classes CSS personnalisées via syntaxe {classe} au début d'un blockquote
// -----------------------------------------------------------------------------
function initCustomBlockquoteClasses() {
    document.querySelectorAll('blockquote').forEach(blockquote => {
        // ✅ FIX 4 : on ne touche qu'au premier nœud texte pour préserver
        // le HTML interne (<strong>, <code>, <a>…).
        const first = blockquote.firstChild;

        let node = first;
        // Ignorer les nœuds vides (whitespace, commentaires)
        while (node && node.nodeType !== Node.TEXT_NODE) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                node = node.firstChild;
            } else {
                node = node.nextSibling;
            }
        }
        if (!node || node.nodeType !== Node.TEXT_NODE) return;

        const text = node.textContent;
        const match = text.match(/^\{([^}]+)\}\s*/);
        if (!match) return;

        const classesArray = match[1].split(/\s+/).filter(Boolean);
        if (classesArray.length) {
            blockquote.classList.add(...classesArray);
        }

        // Retirer uniquement le préfixe {…} du nœud texte courant
        node.textContent = text.slice(match[0].length);
    });
}

// -----------------------------------------------------------------------------
// 3. Classes CSS personnalisées en ligne via syntaxe [texte]{.classe1 .classe2}
// -----------------------------------------------------------------------------
function initInlineCustomClasses() {
    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: node => {
                if (node.parentNode.closest('script, style, code, pre')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return /\[.+\]\s*\{[^}]+\}/.test(node.nodeValue)
                    ? NodeFilter.FILTER_ACCEPT
                    : NodeFilter.FILTER_REJECT;
            }
        }
    );

    const nodesToProcess = [];
    while (walker.nextNode()) {
        nodesToProcess.push(walker.currentNode);
    }

    nodesToProcess.forEach(node => {
        const parent = node.parentNode;
        const text = node.nodeValue;

        // ✅ FIX 5 : construction par DOM (createElement) au lieu de innerHTML,
        // ce qui évite toute injection HTML/XSS via le texte ou les classes.
        const fragment = document.createDocumentFragment();
        const regex = /\[([^\]]+)\]\s*\{([^}]+)\}/g;
        let lastIndex = 0;
        let m;

        while ((m = regex.exec(text)) !== null) {
            const [fullMatch, spanText, rawClasses] = m;

            // Texte avant la correspondance
            if (m.index > lastIndex) {
                fragment.appendChild(
                    document.createTextNode(text.slice(lastIndex, m.index))
                );
            }

            // Construire le <span class="…">
            const cleanClasses = rawClasses
                .replace(/\./g, ' ')
                .trim()
                .replace(/\s+/g, ' ');

            const span = document.createElement('span');
            if (cleanClasses) {
                // split + add() : classes validées une par une, pas d'attribut forgé
                span.classList.add(...cleanClasses.split(' ').filter(Boolean));
            }
            span.textContent = spanText; // textContent => pas d'injection
            fragment.appendChild(span);

            lastIndex = regex.lastIndex;
        }

        if (lastIndex === 0) return; // rien à faire

        if (lastIndex < text.length) {
            fragment.appendChild(
                document.createTextNode(text.slice(lastIndex))
            );
        }

        parent.replaceChild(fragment, node);
    });
}

// -----------------------------------------------------------------------------
// 4. Affichage / masquage du code source HTML
// -----------------------------------------------------------------------------
function toggleSourceCode() {
    const viewer = document.getElementById('html-source-viewer');
    const codeContent = document.getElementById('html-code-content');
    if (!viewer || !codeContent) return;

    // ✅ FIX 7 : on se base sur la visibilité réelle (getComputedStyle) plutôt
    // que sur le style inline, qui peut être géré par une classe CSS.
    const isHidden = getComputedStyle(viewer).display === 'none';

    if (isHidden) {
        codeContent.textContent = document.documentElement.outerHTML;
        viewer.style.display = 'block';
    } else {
        viewer.style.display = 'none';
    }
}

// -----------------------------------------------------------------------------
// 5. Sélection du code source HTML
// -----------------------------------------------------------------------------
function selectHtmlSource() {
    const codeContent = document.getElementById('html-code-content');
    if (!codeContent) return;

    const selection = window.getSelection();
    if (!selection) return;

    const range = document.createRange();
    range.selectNodeContents(codeContent);
    selection.removeAllRanges();
    selection.addRange(range);
}

// -----------------------------------------------------------------------------
// 6. Enregistrement du code source HTML
// -----------------------------------------------------------------------------
async function saveHtmlSource() {
    const html = document.documentElement.outerHTML;
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    const suggestedName = `source_${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}.html`;

    try {
        if (typeof window.showSaveFilePicker === 'function') {
            const handle = await window.showSaveFilePicker({
                suggestedName,
                types: [{
                    description: 'Fichier HTML',
                    accept: { 'text/html': ['.html'] }
                }]
            });

            const writable = await handle.createWritable();
            await writable.write(html);
            await writable.close();
            alert(`✅ Enregistré : ${handle.name}`);
            return;
        }

        const url = URL.createObjectURL(
            new Blob([html], { type: 'text/html;charset=utf-8' })
        );
        const a = document.createElement('a');
        a.href = url;
        a.download = suggestedName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
        alert(`✅ Téléchargement demandé : ${suggestedName}`);
    } catch (err) {
        if (err.name !== 'AbortError') {
            alert(`❌ Erreur : ${err.message}`);
        }
    }
}

// -----------------------------------------------------------------------------
// 7. Galerie d'images
// -----------------------------------------------------------------------------
function initGallery() {
    const m = document.getElementById('m');
    const i = document.getElementById('i');
    const c = document.getElementById('c');

    if (!m || !i || !c) return;

    const close = () => m.classList.remove('open');

    // ✅ FIX 8 : support id OU classe pour la galerie
    const gallery = document.getElementById('gallery') || document.querySelector('.gallery');
    if (gallery) {
        gallery.addEventListener('click', e => {
            const img = e.target.closest('img');
            if (!img) return;

            i.src = img.src;
            m.classList.add('open');
        });
    }

    // ✅ FIX 2 : ne fermer que si le clic est sur l'overlay lui-même,
    // pas sur l'image qu'il contient.
    c.addEventListener('click', e => { e.stopPropagation(); close(); });
    m.addEventListener('click', e => {
        if (e.target === m) close();
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') close();
    });
}

// -----------------------------------------------------------------------------
// 8. Bouton "Afficher le rendu" (ouverture dans un nouvel onglet)
// -----------------------------------------------------------------------------
function initRenderButton() {
    const btn = document.getElementById('btn-render');
    if (!btn) return;

    btn.addEventListener('click', () => {
        const codeContent = document.getElementById('html-code-content');
        const html = codeContent ? codeContent.textContent : '';

        if (!html.trim()) {
            alert('Aucun code HTML à afficher.');
            return;
        }

        const url = URL.createObjectURL(
            new Blob([html], { type: 'text/html;charset=utf-8' })
        );
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10000);
    });
}

// -----------------------------------------------------------------------------
// Initialisation générale
// -----------------------------------------------------------------------------
function initMdBase() {
    // ✅ FIX 6 : ordre plus logique — on traite les alertes AVANT les classes
    // personnalisées, pour que la détection des emojis se fasse sur le contenu
    // HTML encore intact (le texte reste inchangé de toute façon, mais c'est
    // plus robuste si l'on ajoute un jour de la logique au second).
    initAlerts();
    initCustomBlockquoteClasses();
    initInlineCustomClasses();
    initGallery();
    initRenderButton();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMdBase, { once: true });
} else {
    initMdBase();
}

// -----------------------------------------------------------------------------
// 9. Menu latéral
// -----------------------------------------------------------------------------
// ✅ FIX 1 : l'IIFE attend le DOM et vérifie l'existence des éléments.

/*
(function () {
    function initMenu() {
        const btn     = document.getElementById('menu-button');
        const panel   = document.getElementById('menu-panel');
        const close   = document.getElementById('menu-close');
        const overlay = document.getElementById('menu-overlay');

        // Si un seul élément manque, on n'attache aucun listener (pas de crash).
        if (!btn || !panel || !close || !overlay) return;

        const ouvrir = () => {
            panel.classList.add('open');
            overlay.classList.add('open');
        };
        const fermer = () => {
            panel.classList.remove('open');
            overlay.classList.remove('open');
        };

        btn.addEventListener('click', ouvrir);
        close.addEventListener('click', fermer);
        overlay.addEventListener('click', fermer);

        panel.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', fermer);
        });

        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') fermer();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initMenu, { once: true });
    } else {
        initMenu();
    }
})();

*/


