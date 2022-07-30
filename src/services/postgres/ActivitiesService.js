const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const InvariantError = require('../../exceptions/InvariantError');

class ActivitiesService {
  constructor() {
    this._pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  }

  async addPlaylistActivity(playlistId, songId, userId, action) {
    const id = `activities-${nanoid(16)}`;
    const time = new Date().toISOString();
    const query = {
      text: 'INSERT INTO playlist_song_activities VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
      values: [id, playlistId, songId, userId, action, time],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylistActivities(id) {
    const query = {
      text: `SELECT users.username, songs.title, playlist_song_activities.action, playlist_song_activities.time FROM playlist_song_activities
            LEFT JOIN songs ON playlist_song_activities.song_id = songs.id
            LEFT JOIN users ON playlist_song_activities.user_id = users.id
            WHERE playlist_song_activities.playlist_id = $1
            `,
      values: [id],
    };

    const result = await this._pool.query(query);

    return result.rows;
  }
}

module.exports = ActivitiesService;
