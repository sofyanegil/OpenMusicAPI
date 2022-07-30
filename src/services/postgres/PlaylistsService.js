const { nanoid } = require('nanoid');
const { Pool } = require('pg');
const NotFoundError = require('../../exceptions/NotFoundError');
const InvariantError = require('../../exceptions/InvariantError');
const AuthorizationError = require('../../exceptions/AuthorizationError');
const ClientError = require('../../exceptions/ClientError');

class PlaylistsService {
  constructor(collaborationsService, activitiesService, cacheService) {
    this._pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

    this._collaborationsService = collaborationsService;
    this._activitiesService = activitiesService;
    this._cacheService = cacheService;
  }

  async addPlaylist({ name, owner }) {
    const id = `playlist-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlists VALUES ($1, $2, $3) RETURNING id',
      values: [id, name, owner],
    };

    const result = await this._pool.query(query);
    if (!result.rows[0].id) {
      throw new InvariantError('Playlist gagal ditambahkan');
    }

    return result.rows[0].id;
  }

  async getPlaylists(owner) {
    const query = {
      text: `SELECT playlists.id, playlists.name, users.username FROM playlists
            LEFT JOIN collaborations ON collaborations.playlist_id = playlists.id
            LEFT JOIN users ON playlists.owner = users.id
            WHERE playlists.owner = $1 OR collaborations.user_id = $1
            GROUP BY playlists.id, users.username
            `,
      values: [owner],
    };

    const result = await this._pool.query(query);

    return result.rows;
  }

  async deletePlaylistById(id) {
    const query = {
      text: 'DELETE FROM playlists WHERE id = $1 RETURNING id',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Gagal menghapus playlist. Id tidak ditemukan');
    }
  }

  async addSongToPlaylist(playlistId, songId, credentialId) {
    const id = `playlistsong-${nanoid(16)}`;

    const query = {
      text: 'INSERT INTO playlist_songs VALUES ($1, $2, $3) RETURNING id',
      values: [id, playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rows[0].id) {
      throw new InvariantError('Gagal menambahkan lagu ke playlist');
    }

    const action = 'add';
    const userId = credentialId;
    await this._activitiesService.addPlaylistActivity(playlistId, songId, userId, action);
    await this._cacheService.delete(`playlist:${playlistId}`);
  }

  async getPlaylistSongs(id, owner) {
    try {
      const result = await this._cacheService.get(`playlist:${id}`);
      return JSON.parse(result);
    } catch (error) {
      let playlist = await this.getPlaylists(owner);

      playlist = playlist.find((p) => p.id === id);
      const query = {
        text: `SELECT songs.id, songs.title, songs.performer FROM playlist_songs 
            INNER JOIN songs ON playlist_songs.song_id = songs.id
            INNER JOIN playlists ON playlist_songs.playlist_id = playlists.id
            WHERE playlist_songs.playlist_id = $1`,
        values: [id],
      };

      const result = await this._pool.query(query);

      playlist.songs = result.rows;

      await this._cacheService.set(`playlist:${id}`, JSON.stringify(playlist));
      return playlist;
    }
  }

  async deleteSongFromPlaylist(playlistId, songId, credentialId) {
    const action = 'delete';
    const userId = credentialId;
    await this._activitiesService.addPlaylistActivity(playlistId, songId, userId, action);

    const query = {
      text: 'DELETE FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2 RETURNING id',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new ClientError('Gagal menghapus lagu dari playlist');
    }

    await this._cacheService.delete(`playlist:${playlistId}`);
  }

  async checkSongsExist(id) {
    const query = {
      text: 'SELECT * FROM songs WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Gagal menambahkan lagu ke playlist. Lagu tidak ditemukan');
    }
  }

  async checkSongInPlaylist(playlistId, songId) {
    const query = {
      text: 'SELECT * FROM playlist_songs WHERE playlist_id = $1 AND song_id = $2',
      values: [playlistId, songId],
    };

    const result = await this._pool.query(query);

    if (result.rowCount) {
      throw new InvariantError('Lagu sudah ada di playlist');
    }
  }

  async verifyPlaylistOwner(id, owner) {
    const query = {
      text: 'SELECT * FROM playlists WHERE id = $1',
      values: [id],
    };

    const result = await this._pool.query(query);

    if (!result.rowCount) {
      throw new NotFoundError('Playlist tidak ditemukan');
    }

    const playlist = result.rows[0];

    if (playlist.owner !== owner) {
      throw new AuthorizationError('Anda tidak berhak mengakses resource ini');
    }
  }

  async verifyPlaylistAccess(id, userId) {
    try {
      await this.verifyPlaylistOwner(id, userId);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      try {
        await this._collaborationsService.verifyCollaborator(id, userId);
      } catch {
        throw error;
      }
    }
  }
}

module.exports = PlaylistsService;
