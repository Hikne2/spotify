import Spotify from "./spotify.js";

const clientId = "a6e9021c90c34cbca9d2cdec3ab272be";
const redirectUri = "http://localhost:5500"; // change this if needed
const api = new Spotify(clientId, redirectUri);

document.getElementById("login").onclick = () => api.login();

// load token after redirect
const logged = await api.loadTokenFromURL();
if (logged) {
  const playlists = await api.getMyPlaylists();
  document.getElementById("out").textContent = JSON.stringify(playlists, null, 2);
}