const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "*",
  "Content-Type": "application/json"
};

function json(data) {
  return new Response(JSON.stringify(data), {
    headers: corsHeaders
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    const url = new URL(request.url);

    const site = url.searchParams.get("site") || "wallhaven";
    const tags = (url.searchParams.get("tags") || "").trim();
    const exclude = (url.searchParams.get("exclude") || "").trim();

    const maxPage = Number(url.searchParams.get("maxPage")) || 25;
    const tries = Number(url.searchParams.get("tries")) || 10;

    const excludeTags = exclude
      .split(/\s+/)
      .filter(Boolean)
      .map(tag => "-" + tag);

    excludeTags.push("-ai_generated");
    const finalTags = `${tags} ${excludeTags.join(" ")}`.trim();

    const usedPages = new Set();

    for (let attempt = 0; attempt < tries; attempt++) {
      let page;
      do {
        page = Math.floor(Math.random() * maxPage) + 1;
      } while (usedPages.has(page) && usedPages.size < maxPage);

      usedPages.add(page);

      let api = "";
      let fetchOptions = {};

      switch (site) {
        case "NotSafe":
          api = 
            `NotSafe2` +
            `&json=1` +
            `&limit=100` +
            `&pid=${page - 1}` +
            `&tags=${encodeURIComponent(finalTags)}` +
            `&user_id=${env.R34_USER_ID}` +
            `&api_key=${env.R34_API_KEY}`;
          break;

        case "safe":
          api =
            `Safe2` +
            `&json=1` +
            `&limit=100` +
            `&pid=${page - 1}` +
            `&tags=${encodeURIComponent(finalTags)}`;
          break;

        case "picsum":
          break;

        case "openverse":
          api = `https://api.openverse.org/v1/images/?q=${encodeURIComponent(tags || "wallpaper")}&page=${page}&page_size=20`;
          break;

        case "pixabay":
          const pixabayKey = env.PIXABAY_API; 
          api = `https://pixabay.com/api/?key=${pixabayKey}&q=${encodeURIComponent(tags || "wallpaper")}&image_type=photo&per_page=20&page=${page}`;
          break;

        case "wallhaven":
          api = `https://wallhaven.cc/api/v1/search?q=${encodeURIComponent(finalTags)}&page=${page}`;
          break;

        case "pexels":
          const pexelsKey = env.PEXEL_API; 
          api = `https://api.pexels.com/v1/search?query=${encodeURIComponent(tags || "wallpaper")}&per_page=15&page=${page}`;
          fetchOptions = {
            headers: { Authorization: pexelsKey }
          };
          break;

        case "nasa":
          api = `https://images-api.nasa.gov/search?q=${encodeURIComponent(tags || "space")}&media_type=image&page=${page}`;
          break;

        case "met":
          break;

        case "cats":
          api = `https://api.thecatapi.com/v1/images/search?limit=1`;
          break;

        case "tenor":
          // Używamy publicznego klucza testowego Tenora i wpisanego tagu lub domyślnie "memes"
          const tenorQuery = encodeURIComponent(tags || "funny memes");
          api = `https://g.tenor.com/v1/search?q=${tenorQuery}&key=LIVDSRZULELA&limit=20`;
          break;

        default:
          return json({
            success: false,
            error: "Unknown source."
          });
      }

      try {
        let mediaUrl = "";
        let mediaId = "";

        if (site === "picsum") {
          const randomId = Math.floor(Math.random() * 1000) + 1;
          mediaUrl = `https://picsum.photos/id/${randomId}/1920/1080`;
          mediaId = String(randomId);
        }
        else if (site === "met") {
          const searchApi = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(tags || "painting")}`;
          const searchRes = await fetch(searchApi);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            if (searchData.objectIDs && searchData.objectIDs.length > 0) {
              const randomId = searchData.objectIDs[Math.floor(Math.random() * searchData.objectIDs.length)];
              const objApi = `https://collectionapi.metmuseum.org/public/collection/v1/objects/${randomId}`;
              const objRes = await fetch(objApi);
              if (objRes.ok) {
                const objData = await objRes.json();
                if (objData.primaryImage) {
                  mediaUrl = objData.primaryImage;
                  mediaId = objData.objectID;
                }
              }
            }
          }
        } 
        else {
          const response = await fetch(api, fetchOptions);
          if (!response.ok) continue;

          const data = await response.json();

        if (site === "NotSafe" || site === "safe") {
            if (!Array.isArray(data) || data.length === 0)
                continue;
            const random = data[
                Math.floor(Math.random() * data.length)
            ];
            if (!random.file_url)
                continue;
            mediaUrl = random.file_url;
            mediaId = random.id;
        }
          if (site === "openverse") {
            if (!data.results || data.results.length === 0) continue;
            const random = data.results[Math.floor(Math.random() * data.results.length)];
            if (!random.url) continue;
            mediaUrl = random.url;
            mediaId = random.id;
          } 
          else if (site === "pixabay") {
            if (!data.hits || data.hits.length === 0) continue;
            const random = data.hits[Math.floor(Math.random() * data.hits.length)];
            mediaUrl = random.largeImageURL || random.webformatURL;
            mediaId = random.id;
          }
          else if (site === "wallhaven") {
            if (!data.data || data.data.length === 0) continue;
            const random = data.data[Math.floor(Math.random() * data.data.length)];
            if (!random.path) continue;
            mediaUrl = random.path;
            mediaId = random.id;
          } 
          else if (site === "pexels") {
            if (!data.photos || data.photos.length === 0) continue;
            const random = data.photos[Math.floor(Math.random() * data.photos.length)];
            mediaUrl = random.src.large2x || random.src.original;
            mediaId = random.id;
          } 
          else if (site === "nasa") {
            if (!data.collection || !data.collection.items || data.collection.items.length === 0) continue;
            const items = data.collection.items;
            const random = items[Math.floor(Math.random() * items.length)];
            if (!random.links || !random.links[0]) continue;
            mediaUrl = random.links[0].href;
            mediaId = random.data[0].nasa_id;
          }
          else if (site === "cats") {
            if (!data || data.length === 0) continue;
            const random = data[0];
            mediaUrl = random.url;
            mediaId = String(random.id);
          }
          else if (site === "tenor") {
            if (!data.results || data.results.length === 0) continue;
            const random = data.results[Math.floor(Math.random() * data.results.length)];
            // Wybieramy format GIF o wysokiej jakości
            mediaUrl = random.media[0].gif.url;
            mediaId = String(random.id);
          }

        }

        if (!mediaUrl) continue;

        const file = mediaUrl.toLowerCase();
        const type = file.endsWith(".mp4") || file.endsWith(".webm") ? "video" : "image";

        return json({
          success: true,
          image: mediaUrl,
          type,
          id: mediaId,
          site,
          page,
          attempt: attempt + 1
        });

      } catch (e) {
        console.log(e);
      }
    }

    return json({
      success: false,
      error: "Nothing found."
    });
  }
};