// spotify.js
export default class Spotify {
  constructor(clientId, redirectUri) {
    this.clientId = clientId;
    this.redirectUri = redirectUri;
    this.token = null;
    this.refreshToken = null;
  }

  // -------------------------------------------------------------------------
  // PKCE HELPERS
  // -------------------------------------------------------------------------

  async _sha256(buf) {
    return crypto.subtle.digest("SHA-256", new TextEncoder().encode(buf));
  }

  _base64UrlEncode(buffer) {
    return btoa(String.fromCharCode(...new Uint8Array(buffer)))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  }

  async _generateCodeChallenge(codeVerifier) {
    const hash = await this._sha256(codeVerifier);
    return this._base64UrlEncode(hash);
  }

  generateCodeVerifier() {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let res = "";
    for (let i = 0; i < 64; i++) res += chars[Math.floor(Math.random() * chars.length)];
    return res;
  }

  // -------------------------------------------------------------------------
  // LOGIN
  // -------------------------------------------------------------------------

  async login() {
    const verifier = this.generateCodeVerifier();
    const challenge = await this._generateCodeChallenge(verifier);

    localStorage.setItem("spotify_verifier", verifier);

    const scope = encodeURIComponent("playlist-read-private playlist-read-collaborative");

    const url = 
      "https://accounts.spotify.com/authorize" +
      `?client_id=${this.clientId}` +
      "&response_type=code" +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}` +
      `&scope=${scope}` +
      `&code_challenge=${challenge}` +
      "&code_challenge_method=S256";

    // redirect to spotify login
    window.location = url;
  }

  // -------------------------------------------------------------------------
  // EXCHANGE CODE FOR TOKEN
  // -------------------------------------------------------------------------

  async loadTokenFromURL() {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (!code) return false;

    const verifier = localStorage.getItem("spotify_verifier");

    const body = new URLSearchParams({
      client_id: this.clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: this.redirectUri,
      code_verifier: verifier
    });

    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const data = await response.json();
    this.token = data.access_token;
    this.refreshToken = data.refresh_token;

    window.history.replaceState({}, document.title, "/"); // remove ?code=
    return true;
  }

  // -------------------------------------------------------------------------
  // API REQUEST
  // -------------------------------------------------------------------------

  async _request(url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${this.token}` }
    });
    return res.json();
  }

  // -------------------------------------------------------------------------
  // SPOTIFY WRAPPER FUNCTIONS
  // -------------------------------------------------------------------------

  /** Search track */
  searchTrack(query, limit = 1) {
    return this._request(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent("track:" + query)}&type=track&limit=${limit}`
    );
  }

  /** Get a playlist */
  getPlaylist(id) {
    return this._request(`https://api.spotify.com/v1/playlists/${id}`);
  }

  /** Get current user's playlists */
  getMyPlaylists(limit = 50) {
    return this._request(`https://api.spotify.com/v1/me/playlists?limit=${limit}`);
  }
}
