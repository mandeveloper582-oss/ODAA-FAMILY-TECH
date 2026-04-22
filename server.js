 const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
require("dotenv").config();

const app = express();

// ===== MIDDLEWARE =====
app.use(cors());
app.use(express.json());

// ===== STATIC FILES (UPLOADS) =====
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ===== DATABASE =====
mongoose.connect(process.env.MONGO_URI)
.then(()=>console.log("✅ MongoDB Connected"))
.catch(err=>console.log(err));

// ===== ADMIN LIST =====
const allowedAdmins = ["admin1", "admin2"];

// ===== MODELS =====
const Admin = mongoose.model("Admin", new mongoose.Schema({
  username: { type: String, unique: true },
  password: String
}));

const Post = mongoose.model("Post", new mongoose.Schema({
  title: String,
  content: String,
  media: [
    {
      url: String,
      type: String
    }
  ],
  likes: { type: Number, default: 0 },
  comments: [
    {
      name: String,
      text: String
    }
  ],
  createdAt: { type: Date, default: Date.now }
}));

// ===== FILE UPLOAD SETUP =====
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ===== AUTH =====
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ message: "No token" });

  const token = header.split(" ")[1];

  try {
    const decoded = jwt.verify(token, "secret123");
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function onlyAdmin(req, res, next) {
  if (!allowedAdmins.includes(req.user.username)) {
    return res.status(403).json({ message: "Admin only" });
  }
  next();
}

// ===== CREATE ADMIN =====
app.post("/admin/create", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!allowedAdmins.includes(username)) {
      return res.json({ message: "Not allowed username" });
    }

    const hashed = await bcrypt.hash(password, 10);

    await new Admin({ username, password: hashed }).save();

    res.json({ message: "Admin created ✅" });
  } catch {
    res.json({ message: "Admin exists" });
  }
});

const bcrypt = require("bcryptjs");

async function createAdmin(){
  const hashed = await bcrypt.hash("12345", 10);
  await Admin.create({
    username: "admin1",
    password: hashed
  });
  console.log("Admin created ✅");
}

createAdmin();

// ===== LOGIN =====
app.post("/admin/login", async (req, res) => {
  const { username, password } = req.body;

  if (!allowedAdmins.includes(username)) {
    return res.status(403).json({ message: "Not allowed" });
  }

  const admin = await Admin.findOne({ username });
  if (!admin) return res.json({ message: "Admin not found" });

  const ok = await bcrypt.compare(password, admin.password);
  if (!ok) return res.json({ message: "Wrong password" });

  const token = jwt.sign({ username }, "secret123", { expiresIn: "2h" });

  res.json({ token });
});

// ===== CREATE POST (WITH FILES) =====
app.post("/posts", auth, onlyAdmin, upload.array("media"), async (req, res) => {

  const files = req.files;

  let media = [];

  if (files) {
    media = files.map(f => ({
      url: "/uploads/" + f.filename,
      type: f.mimetype
    }));
  }

  const post = new Post({
    title: req.body.title,
    content: req.body.content,
    media
  });

  await post.save();

  res.json(post);
  fetch(BASE_URL + "/posts/",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({
      title: document.getElementById("ptitle").value,
      content: document.getElementById("pcontent").value,
    })
  }
});

// ===== GET POSTS =====
app.get("/posts", async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json(posts);
});

// ===== GET SINGLE =====
app.get("/posts/:id", async (req, res) => {
  const post = await Post.findById(req.params.id);
  res.json(post);
  fetch(BASE_URL + "/posts/" + id)
});

// ===== DELETE =====
app.delete("/posts/:id", auth, onlyAdmin, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json({ message: "Deleted" });
});

// ===== LIKE =====
app.post("/posts/:id/like", async (req, res) => {
  const post = await Post.findById(req.params.id);
  post.likes++;
  await post.save();
 res.json({ likes: post.likes });
 fetch(BASE_URL + "/posts/" + id + "/like", { 
  method:"POST" });
});

// ===== COMMENT =====
app.post("/posts/:id/comments", async (req, res) => {
  const post = await Post.findById(req.params.id);

  post.comments.push({
    name: req.body.name,
    text: req.body.text
  });

  await post.save();

  res.json(post);
});

// ===== DOWNLOAD FILE =====
app.get("/download/:filename", (req, res) => {
  const filePath = path.join(__dirname, "uploads", req.params.filename);
  res.download(filePath);
});

// ===== SERVER =====
app.listen(5000, () => {
  console.log(" Server running http://localhost:5000");
});