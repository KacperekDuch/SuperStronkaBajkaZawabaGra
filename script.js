const WORKER = "https://image.kacperekduch67.workers.dev";

const tags = document.getElementById("tags");
const exclude = document.getElementById("exclude");
const maxPage = document.getElementById("maxPage");
const tries = document.getElementById("tries");
const items = document.getElementById("items");
const siteElement = document.getElementById("site");
const layoutStyle = document.getElementById("layoutStyle");

const gallery = document.getElementById("gallery");

const randomBtn = document.getElementById("randomBtn");
const toggleBtn = document.getElementById("toggleSidebar");
const sidebar = document.getElementById("sidebar");

const preview = document.getElementById("preview");
const previewContent = document.getElementById("previewContent");

const closePreview = document.getElementById("closePreview");
const openPost = document.getElementById("openPost");
const downloadMedia = document.getElementById("downloadMedia");
const copyLink = document.getElementById("copyLink");

const muteBtn = document.getElementById("muteBtn");
const playBtn = document.getElementById("playBtn");

let currentMedia = null;
let muted = true;
let paused = false;

// Przełączanie panelu bocznego
toggleBtn.onclick = () => {
    sidebar.classList.toggle("hidden");
};

// Zmiana stylu galerii w locie
if (layoutStyle) {
    layoutStyle.onchange = () => {
        gallery.className = "";
        gallery.classList.add(`layout-${layoutStyle.value}`);
    };
}

randomBtn.onclick = load;

async function load() {
    randomBtn.disabled = true;
    randomBtn.textContent = "Loading...";

    gallery.innerHTML = "";

    const amount = Number(items.value);
    const promises = [];
    
    // Pobieranie wybranego źródła (działa dla selecta oraz ukrytego inputa)
    const currentSite = siteElement ? siteElement.value : "NotSafe";

    for (let i = 0; i < amount; i++) {
        let excludeVal = exclude ? exclude.value : "";
        let maxPageVal = maxPage ? maxPage.value : "25";
        let triesVal = tries ? tries.value : "10";

        promises.push(
            fetch(
                `${WORKER}?` +
                `site=${currentSite}` +
                `&tags=${encodeURIComponent(tags.value)}` +
                `&exclude=${encodeURIComponent(excludeVal)}` +
                `&maxPage=${maxPageVal}` +
                `&tries=${triesVal}`
            )
            .then(res => res.json())
            .then(data => {
                if (data && data.success) {
                    addCard(data);
                }
            })
            .catch(e => console.error(e))
        );
    }

    await Promise.all(promises);

    randomBtn.disabled = false;
    randomBtn.textContent = "Random";
}

function addCard(data) {
    const card = document.createElement("div");
    card.className = "card";

    const zoom = document.createElement("button");
    zoom.className = "zoomBtn";
    zoom.textContent = "🔍";
    zoom.onclick = e => {
        e.stopPropagation();
        openPreview(data);
    };

    if (data.type === "video") {
        const video = document.createElement("video");
        video.src = data.image;
        video.autoplay = true;
        video.loop = true;
        video.muted = muted;
        video.playsInline = true;
        card.appendChild(video);
    } else {
        const img = document.createElement("img");
        img.src = data.image;
        card.appendChild(img);
    }

    card.appendChild(zoom);

    card.onclick = () => {
        openPreview(data);
    };

    gallery.appendChild(card);
}

muteBtn.onclick = () => {
    muted = !muted;
    document.querySelectorAll("video").forEach(video => {
        video.muted = muted;
    });
    muteBtn.textContent = muted ? "🔇 Unmute All" : "🔊 Mute All";
};

playBtn.onclick = () => {
    paused = !paused;
    document.querySelectorAll("video").forEach(video => {
        if (paused) {
            video.pause();
        } else {
            video.play().catch(() => {});
        }
    });
    playBtn.textContent = paused ? "▶ Play All" : "⏸ Pause All";
};

function openPreview(data) {
    currentMedia = data;
    previewContent.innerHTML = "";

    if (data.type === "video") {
        const video = document.createElement("video");
        video.src = data.image;
        video.controls = true;
        video.autoplay = true;
        video.loop = true;
        video.muted = false;
        previewContent.appendChild(video);
    } else {
        const img = document.createElement("img");
        img.src = data.image;
        previewContent.appendChild(img);
    }

    preview.classList.remove("hidden");
}

closePreview.onclick = () => {
    preview.classList.add("hidden");
    previewContent.innerHTML = "";
    currentMedia = null;
};

openPost.onclick = () => {
    if (!currentMedia) return;

    let url = "";
    if (currentMedia.site === "NotSafe") {
        url = `NotSafeHolder`;
    } else if (currentMedia.site === "safe") {
        url = `SafeHolder`;
    } else {
        url = currentMedia.image;
    }

    window.open(url, "_blank");
};

downloadMedia.onclick = async () => {
    if (!currentMedia) return;

    try {
        const response = await fetch(currentMedia.image);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const a = document.createElement("a");
        a.href = blobUrl;
        a.download = currentMedia.image.split("/").pop() || "media";
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(blobUrl);
    } catch {
        const a = document.createElement("a");
        a.href = currentMedia.image;
        a.target = "_blank";
        a.download = "";
        a.click();
    }
};

copyLink.onclick = async () => {
    if (!currentMedia) return;

    try {
        await navigator.clipboard.writeText(currentMedia.image);
        copyLink.textContent = "✅ Copied";
        setTimeout(() => {
            copyLink.textContent = "📋 Copy Link";
        }, 1500);
    } catch {
        alert("Couldn't copy link.");
    }
};

preview.onclick = e => {
    if (e.target === preview) {
        closePreview.click();
    }
};