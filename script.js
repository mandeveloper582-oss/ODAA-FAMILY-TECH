 const BASE_URL = "http://localhost:5000";

console.log("Frontend loaded 🚀");

document.addEventListener("DOMContentLoaded", () => {

  // ===== ELEMENTS =====
  const menuBtn = document.getElementById("menuBtn");
  const menu = document.getElementById("menu");
  const overlay = document.getElementById("overlay");

  const title = document.getElementById("title");
  const content = document.getElementById("content");
  const likeBtn = document.getElementById("likeBtn");
  const likeCount = document.getElementById("likeCount");
  const media = document.getElementById("media");
  const comments = document.getElementById("comments");

  const commentForm = document.getElementById("commentForm");
  const loginForm = document.getElementById("loginForm");
  const dashboard = document.getElementById("dashboard");
  const postForm = document.getElementById("postForm");

  // ===== MENU OPEN/CLOSE =====
  menuBtn.addEventListener("click", () => {
    menu.classList.add("open");
    overlay.classList.add("active");
  });

  window.closeMenu = function () {
    menu.classList.remove("open");
    overlay.classList.remove("active");
  };

  overlay.addEventListener("click", closeMenu);

  // ===== DARK MODE =====
  document.getElementById("darkToggle").onclick = () => {
    document.body.classList.toggle("dark");
  };

  // ===== TOKEN =====
  window.token = localStorage.getItem("token");
  if (window.token) dashboard.classList.remove("hidden");

  // ===== SECTION SWITCH =====
  window.showSection = function (id) {
    document.querySelectorAll("section").forEach(sec => sec.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");

    menu.classList.remove("open");
    overlay.classList.remove("active");

    if (id === "home") loadPosts();
  };

  // ===== LOCAL STORAGE =====
  function saveLocal(posts) {
    localStorage.setItem("posts_backup", JSON.stringify(posts));
  }

  function getLocal() {
    return JSON.parse(localStorage.getItem("posts_backup")) || [];
  }

  // ===== LOAD POSTS =====
  async function loadPosts() {
    const home = document.getElementById("home");
    home.innerHTML = "Loading...";

    try {
      const res = await fetch(BASE_URL + "/posts");
      const data = await res.json();

      saveLocal(data);
      renderPosts(data);

    } catch (err) {
      console.warn("Backend down → offline mode");
      renderPosts(getLocal());
    }
  }

  // ===== RENDER POSTS =====
  function renderPosts(posts) {
    const home = document.getElementById("home");
    home.innerHTML = "";

    if (!posts || posts.length === 0) {
      home.innerHTML = `"<h3>No posts available</h3>"`;
      return;
    }

    posts.forEach(p => {
      home.innerHTML += `
        <div class="card">
          <h3>${p.title}</h3>
          <p>${p.content.slice(0, 80)}...</p>
          <button onclick="openPost('${p._id || p.id}')">Read More</button>
        </div>
      ;
    `});
  }

  // ===== OPEN POST =====
  window.openPost = async function (id) {
    try {
      const res = await fetch(BASE_URL + "/posts/" + id);
      const p = await res.json();

      showSection("single");

      title.innerText = p.title;
      content.innerText = p.content;
      likeCount.innerText = p.likes || 0;

      likeBtn.onclick = async () => {
        try {
          const r = await fetch(BASE_URL + "/posts/" + id + "/like", {
            method: "POST"
          });
          const d = await r.json();
          likeCount.innerText = d.likes;
        } catch {
          alert("Like failed ❌");
        }
      };

      media.innerHTML = "";
      if (p.media) {
        p.media.forEach(m => {
          if (m.type.includes("image")) {
            media.innerHTML += `<img src="${BASE_URL + m.url}">`;
          } else if (m.type.includes("video")) {
            media.innerHTML += `<video controls src="${BASE_URL + m.url}"></video>`;
          } else {
            media.innerHTML += `<a href="${BASE_URL + m.url}" download>Download file</a>`;
          }
        });
      }
 comments.innerHTML = "";
      if (p.comments) {
        p.comments.forEach(c => {
          comments.innerHTML += `<div class="comment"><b>${c.name}</b>: ${c.text}</div>`;
        });
      }

      window.currentPost = id;

    } catch {
      alert("Error loading post ❌");
    }
  };

  // ===== COMMENT =====
  commentForm.onsubmit = async e => {
    e.preventDefault();

    try {
      await fetch(BASE_URL + "/posts/" + window.currentPost + "/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: document.getElementById("name").value,
          text: document.getElementById("text").value
        })
      });

      openPost(window.currentPost);

    } catch {
      alert("Comment failed ❌");
    }
  };

  // ===== LOGIN =====
  loginForm.onsubmit = async e => {
    e.preventDefault();

    try {
      const res = await fetch(BASE_URL + "/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: document.getElementById("user").value,
          password: document.getElementById("pass").value
        })
      });

      const d = await res.json();

      if (d.token) {
        window.token = d.token;
        localStorage.setItem("token", d.token);
        dashboard.classList.remove("hidden");
        alert("Login success ✅");
      } else {
        alert("Login failed ❌");
      }

    } catch {
      alert("Server error ❌");
    }
  };

  // ===== CREATE POST =====
  postForm.onsubmit = async e => {
    e.preventDefault();

    const fd = new FormData();
    fd.append("title", document.getElementById("ptitle").value);
    fd.append("content", document.getElementById("pcontent").value);

    const files = document.getElementById("file").files;
    for (let f of files) {
      fd.append("media", f);
    }

    try {
      await fetch(BASE_URL + "/posts", {
        method: "POST",
        headers: { Authorization: "Bearer " + window.token },
        body: fd
      });

      alert("Post created 🚀");
      loadPosts();
      showSection("home");

    } catch {
      alert("Create failed ❌");
    }
  };

  // INIT
  showSection("home");
  loadPosts();

});